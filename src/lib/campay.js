const CAMPAY_API_URL = import.meta.env.VITE_CAMPAY_API_URL || "https://demo.campay.net/api";
const CAMPAY_APP_TOKEN = import.meta.env.VITE_CAMPAY_APP_TOKEN;

/**
 * Initiates a direct Mobile Money USSD prompt to the user's phone.
 * The user stays in the app and confirms on their device.
 */
export async function requestPayment(amount, phoneNumber, description, reference) {
  if (!CAMPAY_APP_TOKEN) {
    throw new Error("Campay App Token is missing in environment variables (.env).");
  }

  // Ensure the phone number starts with country code (e.g., 237)
  let formattedNumber = phoneNumber.replace(/[^0-9]/g, "");
  if (formattedNumber.length === 9) {
    formattedNumber = "237" + formattedNumber;
  }

  const response = await fetch(`${CAMPAY_API_URL}/collect/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${CAMPAY_APP_TOKEN}`,
    },
    body: JSON.stringify({
      amount: amount.toString(),
      currency: "XAF",
      from: formattedNumber,
      description: description,
      external_reference: reference, // Our Booking ID
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.description || "Failed to initiate payment prompt");
  }

  return data; // Returns { reference: "uuid", ussd_code: "...", operator: "..." }
}

/**
 * Polls the transaction status to see if the user has completed the USSD prompt.
 */
export async function checkTransactionStatus(reference) {
  const response = await fetch(`${CAMPAY_API_URL}/transaction/${reference}/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${CAMPAY_APP_TOKEN}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to check transaction status");
  }

  return data; // Returns { status: "SUCCESSFUL" | "PENDING" | "FAILED", ... }
}
