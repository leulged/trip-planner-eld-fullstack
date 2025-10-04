// Trip calculation logic for HOS compliance
export interface TripInputData {
  currentLocation: string;
  pickupLocation: string;
  dropoffLocation: string;
  currentCycleUsed: number;
  useSleeperBerth: boolean;
  includeFuelStops: boolean;
}

export interface RouteStop {
  id: string;
  type: 'start' | 'pickup' | 'dropoff' | 'fuel' | 'rest' | 'sleeper';
  location: string;
  time: string;
  duration: number; // minutes
  description: string;
  mileage: number;
  cumulativeDriving: number;
  cumulativeOnDuty: number;
}

export interface TripResult {
  id: string;
  date: string;
  route: string;
  totalDistance: number;
  totalDrivingHours: number;
  totalOnDutyHours: number;
  isCompliant: boolean;
  remainingCycle: number;
  inputData: TripInputData;
  stops: RouteStop[];
  dailyLogs: DailyLog[];
  complianceIssues: string[];
}

export interface DailyLog {
  date: string;
  entries: LogEntry[];
  totals: {
    offDuty: number;
    sleeperBerth: number;
    driving: number;
    onDuty: number;
  };
}

export interface LogEntry {
  time: string;
  status: 'off-duty' | 'sleeper' | 'driving' | 'on-duty';
  location: string;
  remarks?: string;
  mileage?: number;
}

// Mock distance calculation (in real app would use routing API)
function calculateDistance(from: string, to: string): number {
  // Mock distances for common routes - in real app use Google Maps/MapBox API
  const distances: { [key: string]: number } = {
    'dallas,tx-phoenix,az': 887,
    'dallas,tx-houston,tx': 239,
    'atlanta,ga-miami,fl': 662,
    'chicago,il-detroit,mi': 238,
    'los angeles,ca-las vegas,nv': 270,
    'new york,ny-philadelphia,pa': 95,
  };

  const key = `${from.toLowerCase().replace(/[^a-z,]/g, '')}-${to.toLowerCase().replace(/[^a-z,]/g, '')}`;
  const reverseKey = `${to.toLowerCase().replace(/[^a-z,]/g, '')}-${from.toLowerCase().replace(/[^a-z,]/g, '')}`;
  
  return distances[key] || distances[reverseKey] || Math.floor(Math.random() * 800 + 200);
}

export function calculateTrip(inputData: TripInputData): TripResult {
  const startTime = new Date();
  startTime.setHours(6, 0, 0, 0); // Assume 6 AM start
  
  // Calculate distances
  const currentToPickup = calculateDistance(inputData.currentLocation, inputData.pickupLocation);
  const pickupToDropoff = calculateDistance(inputData.pickupLocation, inputData.dropoffLocation);
  const totalDistance = currentToPickup + pickupToDropoff;
  
  const stops: RouteStop[] = [];
  const dailyLogs: DailyLog[] = [];
  const complianceIssues: string[] = [];
  
  let currentTime = new Date(startTime);
  let cumulativeDriving = 0;
  let cumulativeOnDuty = 0;
  let currentMileage = 0;
  let dailyDriving = 0;
  let dailyOnDuty = 0;
  let lastBreakDriving = 0;
  let currentDay = 1;
  
  // Start
  stops.push({
    id: '1',
    type: 'start',
    location: inputData.currentLocation,
    time: formatTime(currentTime),
    duration: 0,
    description: 'Trip Start - Pre-trip inspection',
    mileage: currentMileage,
    cumulativeDriving,
    cumulativeOnDuty
  });
  
  // Add pre-trip time (on-duty, not driving)
  currentTime = addMinutes(currentTime, 30);
  cumulativeOnDuty += 0.5;
  dailyOnDuty += 0.5;
  
  // Drive to pickup
  const driveToPickupHours = currentToPickup / 65; // 65 mph average including traffic
  const driveToPickupTime = Math.ceil(driveToPickupHours * 60);
  
  // Check if need rest break before pickup
  if (lastBreakDriving + driveToPickupHours > 8) {
    // Need 30-minute break
    stops.push({
      id: `rest-${stops.length}`,
      type: 'rest',
      location: `En route to ${inputData.pickupLocation}`,
      time: formatTime(currentTime),
      duration: 30,
      description: '30-minute rest break (required after 8hrs driving)',
      mileage: currentMileage + Math.floor(currentToPickup * 0.6),
      cumulativeDriving,
      cumulativeOnDuty
    });
    
    currentTime = addMinutes(currentTime, 30);
    lastBreakDriving = 0;
  }
  
  currentTime = addMinutes(currentTime, driveToPickupTime);
  cumulativeDriving += driveToPickupHours;
  dailyDriving += driveToPickupHours;
  cumulativeOnDuty += driveToPickupHours;
  dailyOnDuty += driveToPickupHours;
  lastBreakDriving += driveToPickupHours;
  currentMileage += currentToPickup;
  
  // Pickup
  stops.push({
    id: '2',
    type: 'pickup',
    location: inputData.pickupLocation,
    time: formatTime(currentTime),
    duration: 60,
    description: 'Pickup - Loading cargo (1 hour)',
    mileage: currentMileage,
    cumulativeDriving,
    cumulativeOnDuty
  });
  
  currentTime = addMinutes(currentTime, 60);
  cumulativeOnDuty += 1;
  dailyOnDuty += 1;
  
  // Add fuel stops every 1000 miles if enabled
  let remainingDistance = pickupToDropoff;
  let segmentStart = currentMileage;
  
  while (remainingDistance > 0 && inputData.includeFuelStops) {
    let segmentDistance = Math.min(remainingDistance, 1000);
    
    if (remainingDistance > 1000) {
      // Add fuel stop
      const driveHours = segmentDistance / 65;
      const driveTime = Math.ceil(driveHours * 60);
      
      // Check if need rest break
      if (lastBreakDriving + driveHours > 8) {
        // Need 30-minute break first
        stops.push({
          id: `rest-${stops.length}`,
          type: 'rest',
          location: `Mile ${segmentStart + Math.floor(segmentDistance * 0.5)}`,
          time: formatTime(currentTime),
          duration: 30,
          description: '30-minute rest break (required after 8hrs driving)',
          mileage: segmentStart + Math.floor(segmentDistance * 0.5),
          cumulativeDriving,
          cumulativeOnDuty
        });
        
        currentTime = addMinutes(currentTime, 30);
        lastBreakDriving = 0;
      }
      
      currentTime = addMinutes(currentTime, driveTime);
      cumulativeDriving += driveHours;
      dailyDriving += driveHours;
      cumulativeOnDuty += driveHours;
      dailyOnDuty += driveHours;
      lastBreakDriving += driveHours;
      currentMileage += segmentDistance;
      
      stops.push({
        id: `fuel-${stops.length}`,
        type: 'fuel',
        location: `Mile ${currentMileage} - Truck Stop`,
        time: formatTime(currentTime),
        duration: 30,
        description: 'Fuel stop (30 minutes)',
        mileage: currentMileage,
        cumulativeDriving,
        cumulativeOnDuty
      });
      
      currentTime = addMinutes(currentTime, 30);
      cumulativeOnDuty += 0.5;
      dailyOnDuty += 0.5;
      
      remainingDistance -= 1000;
      segmentStart = currentMileage;
    } else {
      // Final segment to destination
      const driveHours = remainingDistance / 65;
      const driveTime = Math.ceil(driveHours * 60);
      
      // Check compliance before final segment
      if (dailyDriving + driveHours > 11) {
        complianceIssues.push('Would exceed 11-hour daily driving limit');
      }
      
      if (dailyOnDuty + driveHours > 14) {
        complianceIssues.push('Would exceed 14-hour driving window');
      }
      
      // Check if need sleeper berth rest
      if (inputData.useSleeperBerth && (dailyDriving > 8 || dailyOnDuty > 12)) {
        stops.push({
          id: `sleeper-${stops.length}`,
          type: 'sleeper',
          location: `Mile ${currentMileage + Math.floor(remainingDistance * 0.5)} - Rest Area`,
          time: formatTime(currentTime),
          duration: 480, // 8 hours
          description: '8-hour sleeper berth rest',
          mileage: currentMileage + Math.floor(remainingDistance * 0.5),
          cumulativeDriving,
          cumulativeOnDuty
        });
        
        currentTime = addMinutes(currentTime, 480);
        dailyDriving = 0; // Reset daily limits after sleeper
        dailyOnDuty = 0;
        lastBreakDriving = 0;
        currentDay++;
      }
      
      currentTime = addMinutes(currentTime, driveTime);
      cumulativeDriving += driveHours;
      dailyDriving += driveHours;
      cumulativeOnDuty += driveHours;
      dailyOnDuty += driveHours;
      currentMileage += remainingDistance;
      
      break;
    }
  }
  
  // Dropoff
  stops.push({
    id: 'dropoff',
    type: 'dropoff',
    location: inputData.dropoffLocation,
    time: formatTime(currentTime),
    duration: 60,
    description: 'Delivery - Unloading cargo (1 hour)',
    mileage: currentMileage,
    cumulativeDriving,
    cumulativeOnDuty
  });
  
  cumulativeOnDuty += 1;
  dailyOnDuty += 1;
  
  // Generate daily logs
  dailyLogs.push(generateDailyLog(stops, startTime, inputData));
  
  // Check overall compliance
  const totalCycleUsed = inputData.currentCycleUsed + cumulativeOnDuty;
  const isCompliant = cumulativeDriving <= 11 && 
                     dailyOnDuty <= 14 && 
                     totalCycleUsed <= 70 && 
                     complianceIssues.length === 0;
  
  if (totalCycleUsed > 70) {
    complianceIssues.push('Would exceed 70-hour cycle limit');
  }
  
  return {
    id: Date.now().toString(),
    date: startTime.toISOString().split('T')[0],
    route: `${inputData.currentLocation} → ${inputData.pickupLocation} → ${inputData.dropoffLocation}`,
    totalDistance,
    totalDrivingHours: Math.round(cumulativeDriving * 10) / 10,
    totalOnDutyHours: Math.round(cumulativeOnDuty * 10) / 10,
    isCompliant,
    remainingCycle: Math.max(0, 70 - totalCycleUsed),
    inputData,
    stops,
    dailyLogs,
    complianceIssues
  };
}

function generateDailyLog(stops: RouteStop[], startTime: Date, inputData: TripInputData): DailyLog {
  const entries: LogEntry[] = [];
  const date = startTime.toISOString().split('T')[0];
  
  // Start with off-duty (assume came from 10-hour break)
  entries.push({
    time: '00:00',
    status: 'off-duty',
    location: 'Home Terminal',
    remarks: 'Off duty - 10 hour break completed'
  });
  
  // Convert stops to log entries
  stops.forEach((stop, index) => {
    let status: 'off-duty' | 'sleeper' | 'driving' | 'on-duty';
    
    switch (stop.type) {
      case 'start':
        status = 'on-duty';
        break;
      case 'pickup':
      case 'dropoff':
      case 'fuel':
        status = 'on-duty';
        break;
      case 'rest':
        status = 'off-duty';
        break;
      case 'sleeper':
        status = 'sleeper';
        break;
      default:
        status = 'driving';
    }
    
    entries.push({
      time: stop.time,
      status,
      location: stop.location,
      remarks: stop.description,
      mileage: stop.mileage
    });
    
    // Add driving segments between stops
    if (index < stops.length - 1 && stop.type !== 'sleeper' && stop.type !== 'rest') {
      const nextStop = stops[index + 1];
      if (nextStop.type !== 'fuel' && nextStop.type !== 'rest' && nextStop.type !== 'sleeper') {
        const endTime = new Date(startTime);
        const [hours, minutes] = stop.time.split(':').map(Number);
        endTime.setHours(hours, minutes + stop.duration);
        
        entries.push({
          time: formatTime(endTime),
          status: 'driving',
          location: `En route to ${nextStop.location}`,
          remarks: 'Driving',
          mileage: stop.mileage
        });
      }
    }
  });
  
  // Calculate totals
  const totals = {
    offDuty: 0,
    sleeperBerth: 0,
    driving: 0,
    onDuty: 0
  };
  
  // Calculate durations between entries
  for (let i = 0; i < entries.length - 1; i++) {
    const current = entries[i];
    const next = entries[i + 1];
    
    const duration = calculateTimeDifference(current.time, next.time);
    
    switch (current.status) {
      case 'off-duty':
        totals.offDuty += duration;
        break;
      case 'sleeper':
        totals.sleeperBerth += duration;
        break;
      case 'driving':
        totals.driving += duration;
        break;
      case 'on-duty':
        totals.onDuty += duration;
        break;
    }
  }
  
  return {
    date,
    entries,
    totals
  };
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function calculateTimeDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60; // Handle day rollover
  
  return diff / 60; // Return hours
}