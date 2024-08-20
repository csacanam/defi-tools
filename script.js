// Function to calculate the amount of TokenA and TokenB required
function calculateLiquidityAmounts(
  totalValue, // Total desired value in terms of TokenA or TokenB
  P, // Current price in TokenB/TokenA
  pa, // Lower price limit in TokenB/TokenA
  pb, // Upper price limit in TokenB/TokenA
  isTokenA // Indicator if totalValue is in TokenA (true) or TokenB (false)
) {
  // Calculate the square roots of the prices
  const sqrtP = P.sqrt();
  const sqrtPa = pa.sqrt();
  const sqrtPb = pb.sqrt();

  let tokenAAmount;
  let tokenBAmount;

  if (isTokenA) {
    // If the input is in terms of TokenA
    tokenAAmount = totalValue;
    tokenBAmount = tokenAAmount.multipliedBy(P);
  } else {
    // If the input is in terms of TokenB
    tokenBAmount = totalValue;
    tokenAAmount = tokenBAmount.dividedBy(P);
  }

  // If the current price is outside the range [pa, pb]
  if (P.isLessThan(pa)) {
    // All should be in TokenA
    return {
      tokenAAmount,
      tokenBAmount: new BigNumber(0),
      tokenARatio: new BigNumber(1),
      tokenBRatio: new BigNumber(0),
    };
  } else if (P.isGreaterThan(pb)) {
    // All should be in TokenB
    return {
      tokenAAmount: new BigNumber(0),
      tokenBAmount,
      tokenARatio: new BigNumber(0),
      tokenBRatio: new BigNumber(1),
    };
  } else {
    // Price within the range, perform the normal calculation with adjustment

    // Function to find adjusted liquidity
    const findLiquidity = (amount) => {
      const L_initial = amount.dividedBy(
        sqrtPb
          .minus(sqrtP)
          .dividedBy(sqrtP.multipliedBy(sqrtPb))
          .plus(sqrtP.minus(sqrtPa))
      );
      return L_initial;
    };

    // Find adjusted liquidity based on TokenB input
    const L = findLiquidity(tokenBAmount);

    // Calculate the required amount of TokenA
    tokenAAmount = L.multipliedBy(sqrtPb.minus(sqrtP)).dividedBy(
      sqrtP.multipliedBy(sqrtPb)
    );

    // Recalculate the amount of TokenB to ensure consistency
    tokenBAmount = L.multipliedBy(sqrtP.minus(sqrtPa));

    // Calculate the values in TokenB of each token
    const tokenAValueInTokenB = tokenAAmount.multipliedBy(P);
    const totalFinalValue = tokenAValueInTokenB.plus(tokenBAmount);

    // Scale back to ensure the ratios are correct
    const scalingFactor = totalValue.dividedBy(totalFinalValue);
    const tokenAAmountScaled = tokenAAmount.multipliedBy(scalingFactor);
    const tokenBAmountScaled = tokenBAmount.multipliedBy(scalingFactor);

    // Calculate the ratios again after scaling
    const tokenARatio = tokenAValueInTokenB.dividedBy(totalFinalValue);
    const tokenBRatio = tokenBAmount.dividedBy(totalFinalValue);

    return {
      tokenAAmount: tokenAAmountScaled,
      tokenBAmount: tokenBAmountScaled,
      tokenARatio,
      tokenBRatio,
    };
  }
}

function calculateNewTokenBalances(inputs) {
  // Extracting input values
  const token1V2 = inputs.investment / 2; // Assuming investment is split between two tokens
  const token2V2 = token1V2 / inputs.currentPrice;

  // Calculating liquidity
  const L = Math.sqrt(token1V2 * token2V2);
  const L2 = token1V2 * token2V2;

  // Calculating thresholds
  const H = L / Math.sqrt(inputs.maxPrice);
  const T = L * Math.sqrt(inputs.minPrice);

  // Calculating maximum tokens
  const maxToken1 = L2 / T - H;
  const maxToken2 = L2 / H - T;

  // Calculate liquidity based on the new price
  const LP_a =
    inputs.currentPrice > inputs.maxPrice
      ? 0
      : (L / Math.sqrt(inputs.currentPrice) - H) * inputs.currentPrice;
  const LP_b =
    inputs.currentPrice > inputs.maxPrice
      ? maxToken2
      : L * Math.sqrt(inputs.currentPrice) - T;
  const LP = LP_a + LP_b;

  // Calculate multiplier based on current conditions
  const multiplier =
    inputs.currentPrice > inputs.minPrice
      ? inputs.investment / LP
      : inputs.investment / (inputs.currentPrice * maxToken1);

  // Determine token amounts at the new price
  let x, y;
  if (inputs.forecastedPrice < inputs.minPrice) {
    x = maxToken1 * multiplier;
    y = 0;
  } else if (
    inputs.forecastedPrice >= inputs.minPrice &&
    inputs.forecastedPrice <= inputs.maxPrice
  ) {
    x = (L / Math.sqrt(inputs.forecastedPrice) - H) * multiplier;
    y = (L * Math.sqrt(inputs.forecastedPrice) - T) * multiplier;
  } else if (inputs.forecastedPrice > inputs.maxPrice) {
    x = 0;
    y = maxToken2 * multiplier;
  }

  return { tokenA: x, tokenB: y };
}

// Function to check if TokenA and TokenB are filled
function checkTokens() {
  const tokenA = document.getElementById("tokenA").value.trim();
  const tokenB = document.getElementById("tokenB").value.trim();
  const baseTokenSelect = document.getElementById("baseToken");
  const formFields = document.getElementById("formFields");
  const investmentField = document.getElementById("investmentField");
  const priceFields = document.getElementById("priceFields");

  if (tokenA !== "" && tokenB !== "") {
    // Populate the baseToken select options with TokenA and TokenB
    baseTokenSelect.innerHTML = `
            <option value="" disabled selected>Select base token</option>
            <option value="${tokenA}">${tokenA}</option>
            <option value="${tokenB}">${tokenB}</option>
        `;

    // Show the baseToken select field
    baseTokenSelect.style.display = "block";

    // Show the form fields
    formFields.style.display = "block";

    // Update the investment, current price, min price, max price fields based on baseToken selection
    baseTokenSelect.addEventListener("change", function () {
      const selectedToken = baseTokenSelect.value;
      const notBaseToken = selectedToken === tokenA ? tokenB : tokenA;

      // Update the placeholder for the investment field
      document.getElementById(
        "investment"
      ).placeholder = `Enter Total Investment in ${selectedToken}`;

      // Update the placeholders for the price fields
      document.getElementById(
        "currentPrice"
      ).placeholder = `Enter Current Price of ${notBaseToken}`;
      document.getElementById(
        "minPrice"
      ).placeholder = `Enter Min Price of ${notBaseToken}`;
      document.getElementById(
        "maxPrice"
      ).placeholder = `Enter Max Price of ${notBaseToken}`;

      // Show the investment and price fields
      investmentField.style.display = "block";
      priceFields.style.display = "block";
    });
  } else {
    // Hide the form fields if TokenA or TokenB are empty
    baseTokenSelect.style.display = "none";
    formFields.style.display = "none";
    investmentField.style.display = "none";
    priceFields.style.display = "none";
  }
}

// Function to simulate position
function simulatePosition() {
  const tokenASymbol = document.getElementById("tokenA").value.trim();
  const tokenBSymbol = document.getElementById("tokenB").value.trim();

  const totalValue = new BigNumber(document.getElementById("investment").value); // Total desired value
  const P = new BigNumber(document.getElementById("currentPrice").value); // Current price
  const pa = new BigNumber(document.getElementById("minPrice").value); // Lower price limit
  const pb = new BigNumber(document.getElementById("maxPrice").value); // Upper price limit
  const isTokenA = true; // This could be dynamic based on user input

  const { tokenAAmount, tokenBAmount, tokenARatio, tokenBRatio } =
    calculateLiquidityAmounts(totalValue, P, pa, pb, isTokenA);

  console.log(
    `Amount of ${tokenASymbol} required: ${tokenAAmount.toString()} ${tokenASymbol}`
  );
  console.log(
    `Amount of ${tokenBSymbol} required: ${tokenBAmount.toString()} ${tokenBSymbol}`
  );
  console.log(
    `${tokenASymbol} ratio: ${tokenARatio.multipliedBy(100).toFixed(2)}%`
  );
  console.log(
    `${tokenBSymbol} ratio: ${tokenBRatio.multipliedBy(100).toFixed(2)}%`
  );

  // Now, call calculateNewTokenBalances
  const inputs = {
    investment: totalValue, // Total investment in USD or equivalent
    currentPrice: P, // Current price in USD per ETH (or other assets)
    minPrice: pa, // Minimum price of the range
    maxPrice: pb, // Maximum price of the range
    forecastedPrice: pb, // New price to calculate the balances at
  };

  const result1 = calculateNewTokenBalances({ ...inputs, forecastedPrice: pb });
  console.log(
    `Price >= pb: ${tokenASymbol} = ${result1.tokenA}, ${tokenBSymbol} = ${result1.tokenB}`
  );

  const result2 = calculateNewTokenBalances({ ...inputs, forecastedPrice: pa });
  console.log(
    `Price <= pa: ${tokenASymbol} = ${result2.tokenA}, ${tokenBSymbol} = ${result2.tokenB}`
  );

  // Update the symbols in the UI
  document
    .querySelectorAll(".tokenASymbol")
    .forEach((el) => (el.textContent = tokenASymbol));
  document
    .querySelectorAll(".tokenBSymbol")
    .forEach((el) => (el.textContent = tokenBSymbol));

  // Display the results in the UI
  document.getElementById("ethAmount").textContent = tokenAAmount.toFixed(6);
  document.getElementById("usdcAmount").textContent = tokenBAmount.toFixed(6);
  document.getElementById("ethPercentage").textContent = `${tokenARatio
    .multipliedBy(100)
    .toFixed(2)}%`;
  document.getElementById("usdcPercentage").textContent = `${tokenBRatio
    .multipliedBy(100)
    .toFixed(2)}%`;
  document.getElementById("minPriceDisplay").textContent = pa.toFixed(2);
  document.getElementById("maxPriceDisplay").textContent = pb.toFixed(2);
  document.getElementById(
    "belowMinPrice"
  ).textContent = `${result2.tokenA.toFixed(6)} ${tokenASymbol}`;
  document.getElementById(
    "aboveMaxPrice"
  ).textContent = `${result1.tokenB.toFixed(6)} ${tokenBSymbol}`;

  // Show the result section
  document.getElementById("resultSection").style.display = "block";
}

// Add event listeners to check tokens on input
document.getElementById("tokenA").addEventListener("input", checkTokens);
document.getElementById("tokenB").addEventListener("input", checkTokens);
