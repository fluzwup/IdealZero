// inputs are muzzle velocity in feet per second, ballistic coefficient (G1 model),
// sight height above bore in inches, and elevation in minutes of arc
// outputs are a vector of heights and a vector of velocities at every foot distance
function RunExtBal(mvel, bc, sightHt, moa, maxRange, trajectory, velocities, times)
{
	// calculate elevation in radians from MOA
	var elev = moa / (180 * 60) * 3.14;

	// delta time, the interval at which the bullet motion is calcuated
	var dt = 0.1 / mvel;	// 10 calculationis per foot

	// the "fudge factors" for supersonic and subsonic flight
	// these numbers are to fit a G1 drag model
	var superfudge = 7900 / dt;
	var subfudge = 18000 / dt;
	// this is how much to reduce the calculted drop values so that drops match the Speer
	// ballistics tables.
	var dropfudge = 0.87;

	// apply fudge factors to ballistic coefficient, so drag can be calculated
	var superbc = superfudge * bc;
	var subbc = subfudge * bc;
	 
	var vvel = 0;
	var drop = 0;

	// set up initial position and velocities
	vvel = -mvel * Math.sin(elev);
	hvel = mvel * Math.cos(elev);
	drop = sightHt / 12;
	var dist = 0;
	var highest = drop;
	 
	// horizontal interval at which we store trajectory information (in yards)
	var check = 10; 
	// Set up flags to denote what state the projectile is in
	var minimum = 0;
	var mpbr = 0;
	var nearZero = 0;
	var farZero = 0;
	 
	// go for up to two and a half seconds, calculating the flight of the projectile
	var t;
	for(t = 0; t < 2.5; t = t + dt)
	{
		// start by storing the distance for each foot (it's OK that we overwrite a bunch,
		//	we do NOT want to skip any or it will mess up the chart)
		trajectory[Math.round(dist)] = drop * 12;
		velocities[Math.round(dist)] = hvel;
		times[Math.round(dist)] = t;
		 
		// add acceleration due to gravity, 32.2 f/s^2
		vvel = vvel + 32.2 * dt;
		 
		//	account for drag, supersonic or subsonic; speed of sound is about 1125 fps
		if(hvel > 1125)
		{
			hvel = hvel - (hvel * hvel) / superbc;
			vvel = vvel - (vvel * vvel) / superbc;
		}
		else
		{
			hvel = hvel - (hvel * hvel) / subbc;
			vvel = vvel - (vvel * vvel) / subbc;
		} 
		 
		// update bullet position; here is where the drop factors in
		drop = drop + vvel * dt * dropfudge;
		dist = dist + hvel * dt;

		// check for terminating conditions
		if(dist > maxRange) t = 100;
	}
}

