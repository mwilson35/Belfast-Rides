module.exports = {
    getWeekStartAndEnd: () => {
        const now = new Date();
        console.log('DEBUG: Current Date:', now.toISOString());

        // Calculate weekStart (Saturday)
        const weekStart = new Date(now);
        const dayOfWeek = now.getDay(); // 0 (Sunday) - 6 (Saturday)
        const offsetToSaturday = (dayOfWeek === 6) ? 0 : -(dayOfWeek + 1 - 7); // Fix to start exactly on Saturday
        weekStart.setDate(now.getDate() + offsetToSaturday); // Adjust correctly to Saturday
        weekStart.setHours(0, 0, 0, 0); // Midnight
        console.log('DEBUG: Calculated weekStart (Saturday):', weekStart.toISOString());

        // Calculate weekEnd (Friday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 5); // Add 5 days to correctly include Friday
        weekEnd.setHours(23, 59, 59, 999); // End of the day
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
