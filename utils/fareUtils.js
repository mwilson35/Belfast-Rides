// utils/fareUtils.js
const calculateFare = (distance, pricing) => {
    const baseFare = pricing.base_fare || 2.5;
    const perKmRate = pricing.per_km_rate || 1.2;
    const surgeMultiplier = pricing.surge_multiplier || 1.0;

    const calculatedFare = baseFare + (distance * perKmRate);
    const totalFare = calculatedFare * surgeMultiplier;

    return parseFloat(totalFare.toFixed(2)); 
};

module.exports = { calculateFare };
