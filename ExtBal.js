// inputs are muzzle velocity in feet per second, ballistic coefficient (G1 model),
// sight height above bore in inches, and elevation in minutes of arc
// outputs are vectors of drops, velocities, time, and drift at every foot distance
// if maxht and maxdrp are greater than zero, then the simulation will stop as soon
// as the evelvation goes over maxht is below maxdrp (after it starts to drop)
function RunExtBal(mvel, bc, sightHt, moa, maxRange, wvel, trajectory, velocities, times, drifts, dispersion, maxht, maxdrp)
{ 
	// clear output arrays
	trajectory.length = 0;
	velocities.length = 0;
	times.length = 0;
	drifts.length = 0;

	// size output arrays
	trajectory.length = maxRange;
	velocities.length = maxRange;
	times.length = maxRange;
	drifts.length = maxRange;

	// calculate elevation in radians from MOA
	var elev = moa / (180 * 60) * 3.14;

	// delta time, the interval at which the bullet motion is calcuated
	var dt = 0.1 / mvel;	// 10 calculationis per foot

	// the "fudge factors" for supersonic and subsonic flight
	// these numbers are to fit a G1 drag model
	var superfudge = 7900 / dt;  // empirically determined drag value for supersonic speeds
	var subfudge = 180000 / dt;  // for subsonic speeds
	var vfactor = 0.87;		  // empirically determined correction for bullet drop
	var wfactor = 1.9;		   // empirically determined value to calculate wind drift

	// apply fudge factors to ballistic coefficient, so drag can be calculated
	var superbc = superfudge * bc;
	var subbc = subfudge * bc;
	 
	var vvel = 0;	// negative vvel is moving up
	var drop = 0;
	// wind drift amount and velocity
	var drift = 0;
	var vdrift = 0;

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
	 
	// go for up to five seconds, calculating the flight of the projectile
	var t;
	for(t = 0; t < 5; t = t + dt)
	{
		// start by storing the distance for each foot (it's OK that we overwrite a bunch,
		//	we do NOT want to skip any or it will mess up the chart)
		trajectory[Math.round(dist)] = drop * 12;  // convert to inches for storage
		velocities[Math.round(dist)] = hvel;
		times[Math.round(dist)] = t;
		drifts[Math.round(dist)] = drift * 12;  // convert to inches for storage
		 
		// add acceleration due to gravity, 32.2 f/s^2
		vvel = vvel + 32.2 * dt;
		
		// account for wind drift
		// add current drift amount
		drift += vdrift * dt;
		// calculate wind/bullet differential
		var deltavdrift = wvel - vdrift;
		// calculate acceleration based on velocity differential
		var accel = Math.sqrt(deltavdrift) * wfactor;
		// calculate new drift velocity based on acceleration
		vdrift += accel * dt;
		 
		// account for drag, supersonic or subsonic; speed of sound is about 1125 fps
		// just in case there's significant vertical velocity, add some drag there, too
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
		 
		// update bullet position
		drop = drop + vvel * dt * vfactor;
		dist = dist + hvel * dt;

		// calculate dispersion, look for terminating conditions
			
		// find the maximum probable +/- error at this range
		// first, find 1 MOA error (1" at 95.5 yards)
		var err = (dist / 3) / 95.5;
		// now multiply by dispersion / 2 to get radis
		err *= (dispersion / 2);
		// now convert to feet
		err /= 12;
		var lowest = drop + err;
		var highest = -drop + err;

		// check max height
		if(maxht > 0 && highest > maxht) 
		{
			t = 100;  // exceeded height
			return -1;	// out of bounds, so this trajectory fails
		}
		// check max drop, but only if we're moving down (in case sight height is more than radius)
		if(maxdrp > 0 && lowest > maxdrp && vvel > 0) 
		{	
			t = 100;  // exceeded drop
			return dist; // max point blank range at this elevation
		}
			
		// check for max range
		if(dist > maxRange) 
		{
			t = 100;			// exceeded range
			return maxRange;
		}

	}
	return -1;		// this shouldn't happen, we should hit a terminating condition above
}
