/** All Campay calls go through our server proxy (no browser CORS, token stays on server). */
const CAMPAY_PROXY = "/api/campay";

/**
 * Initiates a direct Mobile Money USSD prompt to the user's phone.
 */
export async function requestPayment(amount, phoneNumber, description, reference) {
  let formattedNumber = phoneNumber.replace(/[^0-9]/g, "");
  if (formattedNumber.length === 9) {
    formattedNumber = "237" + formattedNumber;
  }

  const response = await fetch(`/api/campay-collect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: amount.toString(),
      currency: "XAF",
      from: formattedNumber,
      description,
      external_reference: reference,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.description || "Failed to initiate payment prompt");
  }

  return data;
}

/**
 * Polls the transaction status after the user confirms on their phone.
 */
export async function checkTransactionStatus(reference) {
  const response = await fetch(`/api/campay-status?reference=${reference}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to check transaction status");
  }

  return data;
}
