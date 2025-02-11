// dateUtils.js

module.exports = {
    // Returns non-overlapping week boundaries as formatted strings.
    // The week is defined as starting on Friday 00:00 (inclusive) and ending on the next Friday 00:00 (exclusive).
    getWeekStartAndEnd: (currentDate = new Date()) => {
      // Convert the current date to local time.
      const localDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000);
  
      // Define Friday as the target day (Friday = 5)
      const targetDay = 5;
      const currentDay = localDate.getDay();
        
      // Calculate days difference to the most recent Friday.
      // If today is Friday (day 5) or later, subtract the difference;
      // if earlier than Friday, wrap around by adding 7.
      const dayDiff = currentDay >= targetDay ? currentDay - targetDay : currentDay + (7 - targetDay);
    
      // weekStart is the most recent Friday at 00:00 local time.
      const weekStart = new Date(localDate);
      weekStart.setDate(localDate.getDate() - dayDiff);
      weekStart.setHours(0, 0, 0, 0);
    
      // weekEnd is exactly 7 days later (next Friday at 00:00), and is exclusive.
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      weekEnd.setHours(0, 0, 0, 0);
    
      // Format the dates in a YYYY-MM-DD format.
      const formattedWeekStart = weekStart.toLocaleDateString('en-CA'); // "en-CA" produces YYYY-MM-DD
      const formattedWeekEnd = weekEnd.toLocaleDateString('en-CA');
    
      return { formattedWeekStart, formattedWeekEnd };
    },
  };
  