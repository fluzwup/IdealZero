	function RunBallistics()
	{
		document.getElementById("status").innerHTML = "Running...";

		var outputDoc = document.getElementById("outputTextArea");
		outputDoc.innerHTML = "Running ballistics.\n";

		// get the parameters needed to calculate the bullet trajectory
		var mvel = document.getElementById("mvel").value;
		var baseBC = document.getElementById("bc").value;
		var sightHt = document.getElementById("sightHt").value;
		var diameter = document.getElementById("targetDia").value;
		var dispersion = document.getElementById("dispersion").value;
		var wvel = 0;	// wind is ignored in this
		var temp = document.getElementById("temp").value; // degrees F
		var pres = document.getElementById("pres").value; // inches of mercury
		var balChartSpacing = 5; 
		
		// converte to absolute
		var abstemp = 459 + parseInt(temp);
		
		// adust BC from 59F and 29.53"
		bc = baseBC;
		bc *= abstemp / 518;
		bc *= 29.53 / pres;
		outputDoc.innerHTML += "Corrected ballisic coefficient " + bc + "\n";

		//	convert from diameter to radius, and inches to feet
		var radius = diameter / 2 / 12;

		// calculate range where dispersion equals target size
		// 1" = 1 moa * 95.5 yards, convert to feet
		var maxRange = 5000;
		if(dispersion > 0.1)
		{
			maxRange = Math.round((diameter / dispersion) * 95.5 * 3 + 1);
		}

		// arrays to store trajecory data
		var trajectory = new Array();
		var velocities = new Array();
		var times = new Array();
		var drifts = new Array();

		// loop through at various angles of elevation to find the best one
		// start way too high 
		var moaMax = 20.0;
		var moaMin = 0;
		var done = false;

		// while finalRange is less than zero, then we're too high, and need to lower the elevation
		// we want the highest elevation possible without a less than zero result, that gives us
		// the maximum point blank range
		while(done == false)
		{
			var moa = (moaMax + moaMin) / 2;
			var thisRange = RunExtBal(mvel, bc, sightHt, moa, maxRange, wvel, 
					trajectory, velocities, times, drifts, dispersion, radius, radius);

			//console.log(moaMin + ", " + moa + ", " + moaMax + ", " + thisRange);

			// negative range is too high, so drop the elevation
			if(thisRange < 0)
			{
				// lower the elevation
				moaMax = moa;
			}
			// if we get a range back, we're not too high, so raise the elevation,
			if(thisRange >= 0)
			{
				moaMin = moa;
			}

			if(moaMax - moaMin < 0.01) done = true;
		}

		// moaMin should be the lowest that gave us a full run, so run it again
		var finalRange = RunExtBal(mvel, bc, sightHt, moaMin, maxRange, wvel, 
					trajectory, velocities, times, drifts, dispersion, radius, radius);
		
		outputDoc.innerHTML += "\n\nTrajectory chart for " + temp + " F and " + pres + " in of mercury\n";
		outputDoc.innerHTML += "Muzzle velocity " + Math.round(mvel) + " fps BC " + baseBC + 
					" sight height " + sightHt + " in\n";
		outputDoc.innerHTML += "Maximum point blank range for " + diameter + " in target is at " + Math.round(finalRange / 3) + " yds.\n";
		outputDoc.innerHTML += "Elevation " + Math.round(moa * 100) / 100 + " moa\n";
		
		var last = trajectory[0]; 
		var nearZero = 0;
		var farZero = 0;
		var yRange = Math.max(sightHt, diameter / 2);
		for(r = 0; r <= finalRange; r++)
		{
			// convert to multiples of 95.5 yards (where 1 MOA = 1 inch)
			var error = (r / 3) / 95.5;
			// convert to radius of error in inches
			error *= dispersion / 2;

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

		outputDoc.innerHTML += "Range\tDrop\tHold\tHold\tTime\tVelocity\n";
		outputDoc.innerHTML += "(yds)\t(in)\t(mil)\t(moa)\t(ms)\t(fps)   \n";
		for(r = 0; r <= finalRange; r += balChartSpacing * 3)
		{
			outputDoc.innerHTML += r / 3 + "\t";
			outputDoc.innerHTML += Math.round(trajectory[r] * 10) / 10 + "\t";
	
			var angle = 0;
			if(r > 0)
				angle = trajectory[r] / (r * 12.0) * 1000;		// approximately the angle in milliradians
			outputDoc.innerHTML += Math.round(angle * 10) / 10 + "\t";
			// 3.43775 minutes per milliradian
			outputDoc.innerHTML += Math.round(angle * 3.43775 * 10) / 10 + "\t";
			outputDoc.innerHTML += Math.round(1000 * (times[r])) + "\t";
			outputDoc.innerHTML += Math.round(velocities[r]) + "\n";
		}

		var outputCanvas = document.getElementById("drawArea");
		var gc = outputCanvas.getContext("2d");
		gc.fillStyle = "white";
		gc.fillRect(0, 0, 750, 500);
	
		// fill probable path cone
		gc.strokeStyle = "black";
		gc.fillStyle = "red";
		gc.beginPath();
		// start at zero
		gc.moveTo(0, 250 + trajectory[0] * 500 / (yRange * 2));
		// draw top line
		for(r = 1; r < finalRange - 1; r++) 
		{
			// calculate group radius at this range to find highest possible point of impact 
			var error = (r / 3) / 95.5;
			error *= (dispersion / 2);
			tMax = trajectory[r] + error;
			gc.lineTo(r * 750 / finalRange, 250 + tMax * 500 / (yRange * 2));
		}
		// draw bottom line back to origin
		for(; r > 0; r--) 
		{
			// calculate group radius at this range to find lowest possible point of impact 
			var error = (r / 3) / 95.5;
			error *= (dispersion / 2);
			tMin = trajectory[r] - error;
			gc.lineTo(r * 750 / finalRange, 250 + tMin * 500 / (yRange * 2));
		}

		// close and fill
		gc.closePath();
		gc.fill();
	
		// draw ideal trajectory
		gc.strokeStyle = "black";
		gc.moveTo(0, 250 + trajectory[0] * 500 / (yRange * 2));
		for(r = 1; r < finalRange - 1; r++) 
				gc.lineTo(r * 750 / finalRange, 250 + trajectory[r] * 500 / (yRange * 2));
		gc.stroke();

		// draw milliradian marks on trajectory
		gc.strokeStyle = "black";
		var mils = 1; 	// number of fractions to look for
		for(r = farZero; r < finalRange; r ++)
		{
			// drop is in inches, r in feet, get angle in MOA
			mrs = 1000 * trajectory[r] / (r * 12.0); 	// approximately the angle in radians times 1000 to get milliradians
			// if we've passed another milliradian, then print the range and look for the next milliradian
			if(mrs > mils)
			{
				gc.moveTo(r * 750 / finalRange - 5, 250 + trajectory[r] * 500 / (yRange * 2));
				gc.lineTo(r * 750 / finalRange + 5, 250 + trajectory[r] * 500 / (yRange * 2));
				gc.moveTo(r * 750 / finalRange, 250 + trajectory[r] * 500 / (yRange * 2) - 5);
				gc.lineTo(r * 750 / finalRange, 250 + trajectory[r] * 500 / (yRange * 2) + 5);
				mils += 1;
			}
		}
		gc.stroke();
	
		// draw grid, inches vertical 10s of yards horizontal	
		gc.strokeStyle = "black";
		gc.fillStyle = "black";
		gc.font = "18px TimesNewRoman";
	
		// determine vertical grid spacing
		var step = 1;
		if(yRange > 10) step = 2;
		if(yRange > 20) step = 5;
		if(yRange > 50) step = 10;
		if(yRange > 100) step = 20;
		if(yRange > 200) step = 50;
		if(yRange > 500) step = 100;
	
		for(r = 0; r < yRange; r += step)
		{
			gc.moveTo(0, 250 + r * 250 / yRange);
			gc.lineTo(750, 250 + r * 250 / yRange);
			gc.stroke();
			gc.moveTo(0, 250 - r * 250 / yRange);
			gc.lineTo(750, 250 - r * 250 / yRange);
			gc.stroke();
			// mark elevation in inches; only do 1 at 0
			if(r > 0)
			{
				gc.fillText(-r, 10, 250 + r * 250 / yRange);
				gc.fillText(r, 10, 250 - r * 250 / yRange);
			}
			else
				gc.fillText(r, 10, 250);
		}
	
		// determine horizontal grid spacing
		step = 30;
		if(finalRange > 450) step = 60;
		if(finalRange > 900) step = 120;
		if(finalRange > 3000) step = 300;
	
		for(r = 0; r < finalRange; r += step)
		{
			gc.moveTo(r * 750 / finalRange, 0);
			gc.lineTo(r * 750 / finalRange, 500);
			gc.stroke();
			// mark range in yards
			if(r > 0) gc.fillText(r / 3, r * 750 / finalRange, 480);
		}

		// label axes
		gc.fillText("Range in yards", 10, 495);
		gc.fillText("Rise/drop in inches", 50, 18);
	
		return "Done";
	}


