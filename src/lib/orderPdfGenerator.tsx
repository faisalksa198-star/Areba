/**
 * Opens the browser-native HTML print report in a new tab and triggers print.
 * Uses /print/customer-report/:orderId for correct Arabic RTL rendering.
 */
export async function generateOrderPdf(orderId: string): Promise<void> {
  const url = `/print/customer-report/${orderId}?autoprint=1`;
  const w = window.open(url, '_blank');
  if (!w) {
    // Popup blocked — navigate in same tab as a fallback
    window.location.href = url;
  }
}
