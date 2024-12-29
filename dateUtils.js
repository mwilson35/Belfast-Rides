module.exports = {
    getWeekStartAndEnd: (currentDate = new Date()) => {
        console.log('DEBUG: Current Date:', currentDate.toISOString());

        // Adjust current date to local timezone
        const localDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000);

        console.log('DEBUG: Adjusted Local Date:', localDate.toISOString());

        // Calculate day of the week (0 = Sunday, 6 = Saturday)
        const dayOfWeek = localDate.getDay();

        // Offset to previous Saturday
        const offsetToSaturday = dayOfWeek === 6 ? 0 : -((dayOfWeek + 1) % 7);

        // Start of the week (Saturday)
        const weekStart = new Date(localDate);
        weekStart.setDate(localDate.getDate() + offsetToSaturday);
        weekStart.setHours(0, 0, 0, 0);

        console.log('DEBUG: Calculated weekStart (Saturday):', weekStart.toISOString());

        // End of the week (Friday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Saturday + 6 = Friday
        weekEnd.setHours(23, 59, 59, 999);

        console.log('DEBUG: Calculated weekEnd (Friday):', weekEnd.toISOString());

        // Format for returning
        const formattedWeekStart = weekStart.toISOString().slice(0, 10);
        const formattedWeekEnd = weekEnd.toISOString().slice(0, 10);

        console.log('DEBUG: Formatted weekStart:', formattedWeekStart);
        console.log('DEBUG: Formatted weekEnd:', formattedWeekEnd);

        return {
            formattedWeekStart,
            formattedWeekEnd,
        };
    },
};
