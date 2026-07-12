/**
 * Frontend client for Payunit payment gateway integration.
 */

/**
 * Initiates a Payunit transaction and returns the hosted page URL.
 * 
 * @param {number|string} amount - The total amount to charge.
 * @param {string} transactionId - Unique identifier for the transaction (e.g., ticket_id).
 * @param {string} returnUrl - URL to redirect the user back to after payment.
 * @param {string} notifyUrl - Optional webhook URL for server-to-server confirmation.
 * @returns {Promise<string>} The Payunit hosted transaction URL.
 */
export async function initializePayment(amount, transactionId, returnUrl, notifyUrl = "") {
  const reqBody = {
    total_amount: parseInt(amount, 10),
    currency: "XAF",
    transaction_id: transactionId,
    return_url: returnUrl,
    payment_country: "CM"
  };

  if (notifyUrl) {
    reqBody.notify_url = notifyUrl;
  }

  const response = await fetch(`/api/payunit-initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
  });

  const data = await response.json();

  if (!response.ok || data.status !== "SUCCESS") {
    console.error("Payunit Init Error:", data);
    throw new Error(data.message || "Failed to initialize Payunit transaction");
  }

  // The hosted payment page URL
  return data.data.transaction_url;
}

/**
 * Initiates a direct Mobile Money USSD push (no redirect).
 * 
 * @param {number|string} amount - The total amount to charge.
 * @param {string} transactionId - Unique identifier for the transaction (e.g., ticket_id).
 * @param {string} phoneNumber - The customer's mobile money phone number.
 * @param {string} returnUrl - URL required by the API.
 * @param {string} notifyUrl - Optional webhook URL.
 * @returns {Promise<object>} The payment response data.
 */
export async function makeDirectPayment(amount, transactionId, phoneNumber, returnUrl, explicitGateway = "", notifyUrl = "") {
  // Format phone number - expect it to already be formatted by caller
  let formattedNumber = phoneNumber.replace(/[^0-9]/g, "");
  if (formattedNumber.length === 9) {
    formattedNumber = "237" + formattedNumber;
  }
  
  // Use explicitly selected gateway (from user choice), or fallback to auto-detect
  let gateway = explicitGateway;
  if (!gateway) {
    gateway = "CM_ORANGE"; // default fallback
    if (/^(237)?(67|650|651|652|653|654|68)/.test(formattedNumber)) {
      gateway = "CM_MTN";
    } else if (/^(237)?(69|655|656|657|658|659)/.test(formattedNumber)) {
      gateway = "CM_ORANGE";
    }
  }

  const reqBody = {
    gateway: gateway,
    amount: parseInt(amount, 10),
    transaction_id: transactionId,
    phone_number: formattedNumber,
    currency: "XAF",
    paymentType: "button",
    return_url: returnUrl
  };

  if (notifyUrl) {
    reqBody.notify_url = notifyUrl;
  }

  const response = await fetch(`/api/payunit-makepayment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
  });

  const data = await response.json();

  if (!response.ok || data.status !== "SUCCESS") {
    console.error("Payunit MakePayment Error:", data);
    throw new Error(data.message || "Failed to push mobile money prompt");
  }

  return data.data;
}

/**
 * Polls the transaction status from Payunit.
 * 
 * @param {string} transactionId - Unique identifier for the transaction (e.g., ticket_id).
 * @returns {Promise<object>} The payment status data.
 */
export async function checkTransactionStatus(transactionId) {
  const response = await fetch(`/api/payunit-status?transactionId=${transactionId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();

  if (!response.ok || data.status !== "SUCCESS") {
    throw new Error(data.message || "Failed to check transaction status");
  }

  return data.data;
}
