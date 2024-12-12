module.exports = {
    getWeekStartAndEnd: () => {
        const now = new Date();

        // Calculate weekStart (Sunday)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Always Sunday
        weekStart.setHours(0, 0, 0, 0); // Midnight

        // Calculate weekEnd (Saturday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 5); // Always Saturday
        weekEnd.setHours(23, 59, 59, 999); // End of the day

        // Log the week range for debugging
        const formattedWeekStart = weekStart.toISOString().slice(0, 10);
        const formattedWeekEnd = weekEnd.toISOString().slice(0, 10);

        console.log('Calculated weekStart:', formattedWeekStart);
        console.log('Calculated weekEnd:', formattedWeekEnd);

        return {
            formattedWeekStart,
            formattedWeekEnd,
        };
    },
};
