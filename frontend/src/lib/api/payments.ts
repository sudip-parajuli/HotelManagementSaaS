import { apiClient } from "./client";

export interface InitiatePaymentResponse {
  transaction_id: number;
  payment_url?: string;
  pidx?: string;
  esewa_payload?: {
    amount: string;
    tax_amount: string;
    total_amount: string;
    transaction_uuid: string;
    product_code: string;
    product_service_charge: string;
    product_delivery_charge: string;
    success_url: string;
    failure_url: string;
    signature: string;
    gateway_url: string;
  };
  qr_code_placeholder?: string;
  message?: string;
}

export const paymentsApi = {
  // Initiate payment checkouts
  initiatePayment: (invoiceId: number, gateway: "esewa" | "khalti" | "fonepay") =>
    apiClient.post<InitiatePaymentResponse>("/payments/initiate/", { invoice_id: invoiceId, gateway }),

  // Verify / Poll transaction statuses
  verifyPolling: (transactionId: number) =>
    apiClient.post<{ status: "success" | "pending"; invoice_id?: number }>(`/payments/${transactionId}/verify_polling/`),
};
