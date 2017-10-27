// inputs are muzzle velocity in feet per second, ballistic coefficient (G1 model),
// sight height above bore in inches, and elevation in minutes of arc
// outputs are a vector of heights and a vector of velocities at every foot distance
function RunExtBal(mvel, bc, sightHt, moa, maxRange, trajectory, velocities)
{
	// calculate elevation in radians from MOA
	var elev = moa / (180 * 60) * 3.14;

	// delta time, the interval at which the bullet motion is calcuated
	var dt = 0.1 / mvel;	// 10 calculationis per foot

	// the "fudge factors" for supersonic and subsonic flight
	// these numbers are to fit a G1 drag model
	var superfudge = 7900 / dt;
	var subfudge = 18000 / dt;

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
		 
		// add acceleration due to gravity, 32.2 f/s^2
		vvel = vvel + 32.2 * dt;
		 
		//	account for drag, supersonic or subsonic; speed of sound is about 1125 fps
		if(hvel > 1125)
			hvel = hvel - (hvel * hvel) / superbc;
		else
			hvel = hvel - (hvel * hvel) / subbc;
		 
		// just in case there's significant vertical velocity, add some drag there, too;
		//	 it will never will be supersonic because terminal velocity is lower than that
		vvel = vvel - (vvel * vvel) / subbc;
		 
		// update bullet position
		drop = drop + vvel * dt;
		dist = dist + hvel * dt;

		// check for terminating conditions
		if(dist > maxRange) t = 100;
	}
}

function RunBallistics()
{
	var outputDoc = document.getElementById("outputTextArea");
	var trajectory;
	var velocities;

  var mvel = 2600;
  var bc = 0.45;
  var sightHt = 2.5;
  var maxRange = 3 * 1000;
  var moa = 6.5;

	// arrays to store trajecory data; trajectory is center, velocities is velocity at each point
	//	This forms a bent cone of possible locations of the projectile
	trajectory = new Array();
	velocities = new Array();

	trajectory.length = maxRange + 1;
	velocities.length = maxRange + 1;

	RunExtBal(mvel, bc, sightHt, moa, maxRange, trajectory, velocities);

	outputDoc.innerHTML = "Trajectory chart\n";
	outputDoc.innerHTML += "Muzzle velocity " + Math.round(mvel) + " fps BC " + bc + 
			" sight height " + sightHt + " in\n";
	outputDoc.innerHTML += "Elevation " + Math.round(moa * 100) / 100 + " moa\n";

  var last = trajectory[0]; 
  var nearZero;
  var farZero;
	for(r = 0; r <= maxRange; r++)
	{
		if(last > 0 && trajectory[r] <= 0)
		{
			nearZero = r;
			outputDoc.innerHTML += "Near zero at " + Math.round(r / 3) + "yds\n";	
		}

		if(last < 0 && trajectory[r] >= 0)
		{
			farZero = r;
			outputDoc.innerHTML += "Far zero at " + Math.round(r / 3) + "yds\n";	
		}

		last = trajectory[r];
	}

	outputDoc.innerHTML += "Range\tDrop\tHold\tHold\tEnergy\n";
	outputDoc.innerHTML += "(yds)\t(in)\t(moa)\t(mil)\t(%)\n";
	for(r = 0; r <= maxRange; r += 25 * 3)
	{
		outputDoc.innerHTML += r / 3 + "\t";
		outputDoc.innerHTML += Math.round(trajectory[r] * 10) / 10 + "\t";

		var angle = 0;
		// drop is in inches, r in feet, get angle in MOA
		if(r > farZero)
		{
			angle = trajectory[r] / (r * 12.0); 	// approximately the angle in radians
			angle = angle * 180 / 3.14 * 60;	// radians to degrees, then to minutes

			outputDoc.innerHTML += Math.round(angle) + "\t";
			outputDoc.innerHTML += Math.round(10 * angle / 3.44) / 10 + "\t";
		}
		else
			outputDoc.innerHTML += " \t \t";

		outputDoc.innerHTML += Math.round(100 * (velocities[r] * velocities[r]) / (mvel * mvel)) + "\n";
	}
}

