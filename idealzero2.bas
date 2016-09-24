



cls
print "Ballistic simulation to calculate maximum point blank range (MPBR) for a given cartridge, firearm, and target size.  MPBR is ";
print "defined as the longest range (minimum to maximum) that a given cartridge and firearm combination can be counted on to hit ";
print "a target of a given size with no hold-over or -under or sight adjustment.  This is similar to a battlefield zero."
print
print "This version is unique in that it also accounts for dispersion, so that a group fired at the target should all end up on target ";
print "at any range within the MPBR.  To calculate a pure MPBR, use a dispersion of zero."
print
print "Interesting test cases, listed as type: velocity, BC, sight height, target diameter, dispersion:"
print ".22 LR with high mount scope:  1100, .1, 3, 2, 1"
print ".45 pistol: 850, .22, .5, 8, 20"
print "12 gauge slug: 1600, .11, 1, 8, 6"
print "The .22 is limited by trajectory, with a group size at MPBR much smaller than the target diameter."
print "The .45 is limited by accuracy, which puts the far zero at the MPBR distance."
print "The 12 gauge slug is limited by both trajectory and accuracy; see what happens when the dispersion is changed."
print

rem delta time, the interval at which the bullet motion is calcuated
dt = 0.0001

rem the "fudge factors" for supersonic and subsonic flight
rem these numbers are to fit a G1 drag model
superfudge = 7900 / dt
subfudge = 18000 / dt   

rem get the parameters needed to calculate the bullet trajectory
INPUT "Muzzle velocity (feet per second)"; mvel
INPUT "Ballistic coefficient"; bc
INPUT "Sight height (inches)"; sightHt
INPUT "Target diameter (inches)"; diameter
input "Dispersion (c-t-c group diameter in minutes of arc)"; dispersion

rem  convert from diameter to radius
radius = diameter / 2

rem calculate range where dispersion equals target size
rem 1" = 1 moa * 95.5 yards, convert to feet
if(dispersion > 0.1) then
  maxRange = (diameter / dispersion) * 95.5 * 3 + 1
  print "Dispersion equals target diameter at "; cint(maxRange / 3); "yds"
else
  maxRange = 5000
end if

if radius > sightHt then
  winHt = 150 * radius
else
  winHt = 150 * sightHt
end if   

window 0, -winHt, maxRange, winHt

cls

locate 1, 0
print "Muzzle velocity "; mvel; "fps bc "; bc; " sight height "; sightHt; "in target diameter "; diameter; "in dispersion "; dispersion; "moa"

rem arrays to store trajecory data; trajectory is center, tMax is max possible height, tMin is min possible height
rem  This forms a bent cone of possible locations of the projectile
dim trajectory(int(maxRange))
dim tMax(int(maxRange))
dim tMin(int(maxRange))
 
rem apply fudge factors to ballistic coefficient, so drag can be calculated
superbc = superfudge * bc
subbc = subfudge * bc
 
rem  calculate the vertical velocity needed to reach the peak height by calculating
rem   the velocity after dropping that distance
rem maxHt is the maximum vertical travel allowed to fit the arc
maxHt = (radius + sightHt) / 12

vvel = 0
FOR t = 0 TO 5 STEP dt
  vvel = vvel + 32.2 * dt
  drop = drop + vvel * dt
  if drop >= maxHt then t = 100
next t

rem back off that last dt, since we exceeded the max height
maxvvel = vvel * 2

rem The calculated height is only an approximation; actual elevation will be less, due to dispersion.
rem This is the step size for adjusting the vertical velocity (and thus the elevation) downwards as
rem  we iterate through to find the ideal elevation.
vvelStep = 0.5

while maxvvel >= 0
  rem start with maximum upwards velocity (negative, since it's drop) and work downwards from there
  vvel = maxvvel
  print "Checking vertical velocity "; vvel; "fps"
  maxvvel = maxvvel - vvelStep

  locate 3, 0
  rem calculate the elevation needed in MOA to generate the required vertical velocity
  rem  use the arc tangent of the two velocity vectors
  slope = vvel / mvel
  elev = atn(slope)
 
  rem convert from radians returned by atn to minutes of arc
  moa = elev / 3.14 * 180 * 60
 
  rem print out elevation rounded to tenths of a minute of arc
  print "Elevation, "; cint(moa * 100) / 100; "moa"

  rem set up initial position and velocities
  vvel = -mvel * sin(elev)
  hvel = mvel * cos(elev)
  drop = sightHt / 12
  dist = 0
 
  rem horizontal interval at which we store trajectory information (in yards)
  check = 10  
  rem Set up flags to denote what state the projectile is in
  minimum = 0
  maximum = 0
  zero = 0
  nearZero = 0
 
  rem go for up to two and a half seconds, calculating the flight of the projectile
  FOR t = 0 TO 2.5 STEP dt
    
    rem start by storing the distance for each foot (it's OK that we overwrite a bunch, 
    rem  we do NOT want to skip any or it will mess up the chart)
    trajectory(int(dist)) = -drop * 12
    tMax(int(dist)) = (-drop + dispRange) * 12
    tMin(int(dist)) = (-drop - dispRange) * 12
    
    rem add acceleration due to gravity, 32.2 f/s^2
    vvel = vvel + 32.2 * dt
    
    rem  account for drag, supersonic or subsonic; speed of sound is about 1125 fps
    IF hvel > 1125 THEN
      hvel = hvel - (hvel ^ 2) / superbc
    ELSE
      hvel = hvel - (hvel ^ 2) / subbc
    END IF
    
    rem just in case there's significant vertical velocity, add some drag there, too;
    rem   it will never will be supersonic because terminal velocity is lower than that
    vvel = vvel - (vvel ^ 2) / subbc
    
    rem update bullet position
    drop = drop + vvel * dt
    dist = dist + hvel * dt
 
    rem  stop calculating MPBR stuff once we drop too low
    if maximum = 0 then
      rem  if vvel is greater than zero, we're falling, so calculate zero and max range
      if vvel > 0 then
        if drop > 0 and zero <= 0 then
          rem  far zero, where the projectile crosses the line of sight going down
          zero = dist  
        end if
        rem  stop updating when it drops below target radius; drop is in feet
        if drop > radius / 12 and maximum <= 0 then
          maximum = dist
        end if
      else  
        rem  if vvel is less than zero, we're going up so calculate minimum range
        if drop < radius / 12 and minimum <= 0 then
          minimum = dist
        end if
        if drop < 0 and nearZero <= 0 then
          rem near zero--where the projectile crosses line of sight going up
          nearZero = dist
        end if
      end if
    end if
    
    rem check for terminating conditions
    IF hvel <= 0 THEN t = 100
    if maximum > 0 and drop > radius / 12 then t = 100
    if dist > maxRange then t = 100
    
    rem check for dispersion out of bounds; first figure out error
    rem divide by 2 for radius
    dispRange = dispersion * (dist / 3) / 95.5 / 2
    rem convert to feet to match drop
    dispRange = dispRange / 12

    rem if we're too high, then we need to lower the trajectory and restart 
    if -drop + dispRange > radius / 12 then
      print "Possible path too high at distance "; cint(dist / 3); "yds"
      t = 100
    end if
    
    rem the first trajectory that falls too low is our maximum, so end the adjsutment loop
    if vvel >  0 and drop + dispRange > radius / 12 then
      print "Possible path too low at distance "; cint(dist / 3); "yds, vvel "; vvel
      t = 100
      
      rem if the step is still big, back up and cut the step size in half
      if vvelStep > 0.01 then
        maxvvel = maxvvel + vvelStep * 2
        vvelStep = vvelStep / 2
        print "Adjusting step size down to "; vvelStep; " resetting velocity to "; maxvvel
        cls
      else
        maxvvel = -1
        maximum = dist
        cls
      endif
    end if
    
    rem every 10 yards print out the stats
    IF (dist) > check * 3 THEN
      PRINT "range "; int(dist / 3); "yds  velocity "; cint(hvel); "f/s  drop "; cint(drop * 120) /  10 - cint(dispRange * 120) / 10; " to "; cint(drop * 120) /  10 + cint(dispRange * 120) / 10; "in"
      check = check + 10
    END IF
        
  NEXT t
    
wend

window 0, -winHt, dist, winHt

cls

DrawTrajectories dist

locate 1, 0
input "Enter to continue"; blah

print "Muzzle velocity "; mvel; "fps bc "; bc; " sight height "; sightHt; "in target diameter "; diameter; "in dispersion "; dispersion; "moa"
print " Maximum point blank range "; cint(maximum / 3); "yds, minimum range "; cint(minimum / 3); "yds"
print " Near zero "; cint(nearZero / 3); "yds, far zero "; cint(zero / 3); "yds
print " Dispersion at maximum range +/-"; cint(dispRange * 120) / 10; "in, drop "; cint(drop * 120) / 10; "in, velocity "; cint(hvel); "fps"
rem  calculate where bore line (slope times distance minus sight height) crosses line of size (zero) for boresighting distance
BSdist = (sightHt / 12) / slope
print " Bore sighting distance "; cint(10 * BSdist / 3) / 10; "yds"

open "ballistic_chart.txt" for output as #1

print #1; "Optimum zero trajectory chart"
print #1; "Muzzle velocity "; mvel; "fps, ballistc coefficient "; bc; ", sight height "; sightHt; "in "
print #1; "Target diameter "; diameter; "in, bullet dispersion "; dispersion; "moa"
print #1;
print #1; "Maximum point blank range "; cint(maximum / 3); "yds, minimum range "; cint(minimum / 3); "yds"
print #1; "Near zero "; cint(nearZero / 3); "yds, far zero "; cint(zero / 3); "yds"
print #1; "Dispersion at maximum range +/-"; cint(dispRange * 120) / 10; "in, drop "; cint(drop * 120) / 10; "in, velocity "; cint(hvel); "fps"
print #1; "Bore sighting distance "; cint(10 * BSdist / 3) / 10; "yds, barrel elevation, "; cint(moa * 100) / 100; "moa"
print #1;
print #1; "Range     Elevation  Group    Max / Min"
print #1; "(yds)      (inch)    (inch)    (inch)
for i = 0 to dist - 1 step 15
rem  print #1; "Range "int(i / 3); "yds  elevation "; int(trajectory(i) * 10) / 10; "in  group "; int((tMax(i) - tMin(i)) * 10) / 10; "in  range "; int(tMax(i) * 10) / 10; "/"; int(tMin(i) * 10) / 10; "in"
  print #1; using "####      ###.#     ##.#     ##.# / ##.#"; int(i / 3), int(trajectory(i) * 10) / 10, int((tMax(i) - tMin(i)) * 10) / 10, int(tMax(i) * 10) / 10, int(tMin(i) * 10) / 10

next i

close #1

end

sub DrawTrajectories(dist) - 1
  for i = 0 to int(dist) step 15
    line i, -winHt, i, winHt, 7
  next i
  
  for i = 100 to winHt step 100
    line 0, i, dist, i, 7
    line 0, -i, dist, -i, 7 
  next i
  
  line 0, 0, dist, 0, 12
  
  line 0, radius * 100, dist, radius * 100, 10
  line 0, -radius * 100, dist, -radius * 100, 10
  
  for i = 1 to int(dist) - 1
    line i - 1, trajectory(i - 1) * 100, i, trajectory(i) * 100
    line i - 1, tMax(i - 1) * 100, i, tMax(i) * 100
    line i - 1, tMin(i - 1) * 100, i, tMin(i) * 100
  next i
  
end
