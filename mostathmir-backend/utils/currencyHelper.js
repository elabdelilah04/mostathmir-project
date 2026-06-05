// utils/currencyHelper.js

const EXCHANGE_RATES = {
    "USD": 1,
    "MAD": 10.05,
    "SAR": 3.75,
    "AED": 3.67,
    "EUR": 0.92,
    "QAR": 3.64,
    "KWD": 0.31,
    "BHD": 0.38,
    "OMR": 0.39,
    "EGP": 47.50,
    "JOD": 0.71
};

/**
 * دالة عالمية للتحويل المالي في السيرفر
 */
const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    
    // التحويل إلى الدولار كعملة وسيطة (Base)
    const amountInUSD = amount / (EXCHANGE_RATES[fromCurrency] || 1);
    
    // التحويل من الدولار إلى العملة المستهدفة
    const finalAmount = amountInUSD * (EXCHANGE_RATES[toCurrency] || 1);
    
    return parseFloat(finalAmount.toFixed(2));
};

module.exports = { EXCHANGE_RATES, convertCurrency };