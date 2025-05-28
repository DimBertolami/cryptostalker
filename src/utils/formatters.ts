export const formatCurrency = (value: number | null | undefined, digits: number = 2): string => {
  if (value === null || value === undefined) {
    return '-'; // Or '$0.00M', or whatever you prefer for null/undefined values
  }

  const absValue = Math.abs(value);

  if (absValue >= 1.0e+9) { // Billions
    return `$${(value / 1.0e+9).toFixed(digits)}B`;
  }
  if (absValue >= 1.0e+6) { // Millions
    return `$${(value / 1.0e+6).toFixed(digits)}M`;
  }
  if (absValue >= 1.0e+3) { // Thousands
    return `$${(value / 1.0e+3).toFixed(digits)}K`;
  }
  return `$${value.toFixed(digits)}`; // Less than 1000
};

// Example usage:
// console.log(formatCurrency(1234567890)); // $1.23B
// console.log(formatCurrency(1234567));    // $1.23M
// console.log(formatCurrency(1234));       // $1.23K
// console.log(formatCurrency(123.45));    // $123.45
// console.log(formatCurrency(3527700));    // $3.53M (for your example 3527,7K which is 3,527,700)
// console.log(formatCurrency(68773100));   // $68.77M (for your example $68773.1K which is 68,773,100)
