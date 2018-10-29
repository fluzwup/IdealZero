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
		var moa = document.getElementById("elevation").value;
		var wvel = document.getElementById("wind").value * 5280 / 3600; // mph to fps conversion
		var temp = document.getElementById("temp").value; // degrees F
		var pres = document.getElementById("pres").value; // inches of mercury
		var balChartSpacing;
		if(document.getElementById("yd_25").checked) balChartSpacing = 25; 
		if(document.getElementById("yd_50").checked) balChartSpacing = 50; 
		if(document.getElementById("yd_100").checked) balChartSpacing = 100; 
		var milChartSpacing;
		if(document.getElementById("mil_1.0").checked) milChartSpacing = 1.0; 
		if(document.getElementById("mil_0.5").checked) milChartSpacing = 0.5; 
		if(document.getElementById("mil_0.25").checked) milChartSpacing = 0.25; 
		if(document.getElementById("moa_1").checked) milChartSpacing = -1.0; 
		if(document.getElementById("moa_5").checked) milChartSpacing = -5.0; 
		
		// converte to absolute
		var abstemp = 459 + parseInt(temp);
		
		// adust BC from 59F and 29.53"
		bc = baseBC;
		bc *= abstemp / 518;
		bc *= 29.53 / pres;
		outputDoc.innerHTML += "Corrected ballisic coefficient " + bc + "\n";

		//	convert from diameter to radius
		var radius = diameter / 2;

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

		trajectory.length = maxRange;
		velocities.length = maxRange;
		times.length = maxRange;
		drifts.length = maxRange;

		RunExtBal(mvel, bc, sightHt, moa, maxRange, wvel, trajectory, velocities, times, drifts, 0, 0);
		
		outputDoc.innerHTML += "\n\nTrajectory chart for " + temp + " F and " + pres + " in of mercury\n";
		outputDoc.innerHTML += "Muzzle velocity " + Math.round(mvel) + " fps BC " + baseBC + 
					" sight height " + sightHt + " in\n";
		outputDoc.innerHTML += "Maximum range for " + diameter + " in group is at " + Math.round(maxRange / 3) + " yds.\n";
		outputDoc.innerHTML += "Elevation " + Math.round(moa * 100) / 100 + " moa and crosswind of ";
		outputDoc.innerHTML += wvel * 3600 / 5280 + " mph\n";
		
		var last = trajectory[0]; 
		var nearZero = 0;
		var farZero = 0;
		var yRange = 0;
		for(r = 0; r <= maxRange; r++)
		{
			if(Math.abs(trajectory[r]) > yRange) yRange = Math.abs(trajectory[r]);
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
	
		outputDoc.innerHTML += "Range\tDrop\tHold\tHold\tDrift\tWindage\tVelocity\n";
		outputDoc.innerHTML += "(yds)\t(in)\t(mil)\t(moa)\t(in) \t(mil)  \t(fps)   \n";
		for(r = 0; r <= maxRange; r += balChartSpacing * 3)
		{
			outputDoc.innerHTML += r / 3 + "\t";
			outputDoc.innerHTML += Math.round(trajectory[r] * 10) / 10 + "\t";
	
			var angle = 0;
			if(r > 0)
				angle = trajectory[r] / (r * 12.0) * 1000;		// approximately the angle in milliradians
			outputDoc.innerHTML += Math.round(angle * 10) / 10 + "\t";
			outputDoc.innerHTML += Math.round(10 * 3.43775 * angle) / 10 + "\t";	// convert milliradians to MOA
			outputDoc.innerHTML += Math.round(drifts[r]) + "\t";
			if(r > 0)
				angle = drifts[r] / (r * 12.0) * 1000;		// approximately the angle in milliradians
			outputDoc.innerHTML += Math.round(10 * angle) / 10 + "\t";
			outputDoc.innerHTML += Math.round(velocities[r]) + "\n";
		}

		outputDoc.innerHTML += "\n\nHold-over range chart\n";
		outputDoc.innerHTML += "Hold\tRange\tTime\n";
		if(milChartSpacing > 0)
		{
			outputDoc.innerHTML += "(mil)\t(yds)\t(ms)\n";

			// go through the trajectory a yard at a time looking for quarter radian increments in drop
			var fractions;
			fractions = 1 / milChartSpacing;		// number of divisions per milliradtion; 2 is half mils, 4 is quarter mils

			var fractionalMils = 1; 	// number of fractions to look for
			for(r = farZero; r < maxRange; r += 3)
			{
				// drop is in inches, r in feet, get angle in MOA
				mrs = 1000 * trajectory[r] / (r * 12.0); 	// approximately the angle in radians times 1000 to get milliradians
				// if we've passed another milliradian, then print the range and look for the next milliradian
				if(mrs > fractionalMils / fractions)
				{
					outputDoc.innerHTML += fractionalMils / fractions + "\t" + Math.round(r / 3) + "\t" + Math.round(1000 * times[r]) + "\n";
					fractionalMils += 1;
				}
			}
		}
		else
		{
			outputDoc.innerHTML += "(moa)\t(yds)\t(ms)\n";

			// go through the trajectory a yard at a time looking for MOA increments in drop
			moa = -milChartSpacing;
			for(r = farZero; r < maxRange; r += 3)
			{
				// drop is in inches, r in feet, get angle in MOA
				moas = trajectory[r] * 3600 / (r * 12.0) * 0.955; 	// approximately the angle in MOA
				if(moas > moa)
				{
					outputDoc.innerHTML += moa + "\t" + Math.round(r / 3) + "\t" + Math.round(1000 * times[r]) + "\n";
					moa -= milChartSpacing;
				}
			}
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
		for(r = 1; r < maxRange - 1; r++) 
		{
			// calculate group radius at this range to find highest possible point of impact 
			var error = (r / 3) / 95.5 * (dispersion / 2);
			tMax = trajectory[r] + error;
			gc.lineTo(r * 750 / maxRange, 250 + tMax * 500 / (yRange * 2));
		}
		// draw bottom line back to origin
		for(; r > 0; r--) 
		{
			// calculate group radius at this range to find lowest possible point of impact 
			var error = (r / 3) / 95.5 * (dispersion / 2);
			tMin = trajectory[r] - error;
			gc.lineTo(r * 750 / maxRange, 250 + tMin * 500 / (yRange * 2));
		}

		// close and fill
		gc.closePath();
		gc.fill();
	
		// draw ideal trajectory
		gc.strokeStyle = "black";
		gc.moveTo(0, 250 + trajectory[0] * 500 / (yRange * 2));
		for(r = 1; r < maxRange - 1; r++) 
				gc.lineTo(r * 750 / maxRange, 250 + trajectory[r] * 500 / (yRange * 2));
		gc.stroke();

		// draw milliradian marks on trajectory
		gc.strokeStyle = "black";
		var mils = 1; 	// number of fractions to look for
		for(r = farZero; r < maxRange; r ++)
		{
			// drop is in inches, r in feet, get angle in MOA
			mrs = 1000 * trajectory[r] / (r * 12.0); 	// approximately the angle in radians times 1000 to get milliradians
			// if we've passed another milliradian, then print the range and look for the next milliradian
			if(mrs > mils)
			{
				gc.moveTo(r * 750 / maxRange - 5, 250 + trajectory[r] * 500 / (yRange * 2));
				gc.lineTo(r * 750 / maxRange + 5, 250 + trajectory[r] * 500 / (yRange * 2));
				gc.moveTo(r * 750 / maxRange, 250 + trajectory[r] * 500 / (yRange * 2) - 5);
				gc.lineTo(r * 750 / maxRange, 250 + trajectory[r] * 500 / (yRange * 2) + 5);
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
		if(maxRange > 450) step = 60;
		if(maxRange > 900) step = 120;
		if(maxRange > 3000) step = 300;
	
		for(r = 0; r < maxRange; r += step)
		{
			gc.moveTo(r * 750 / maxRange, 0);
			gc.lineTo(r * 750 / maxRange, 500);
			gc.stroke();
			// mark range in yards
			if(r > 0) gc.fillText(r / 3, r * 750 / maxRange, 480);
		}

		// label axes
		gc.fillText("Range in yards", 10, 495);
		gc.fillText("Rise/drop in inches", 50, 18);
	
		return "Done";
	}


