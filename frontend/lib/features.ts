// Product feature switches. Flip a flag to bring a feature back; its code stays in place.

// Chat with Muse is turned off (Nov 2026). The backend /api/v1/chat routes and the
// chat UI in app/chat/ChatView.tsx are kept. Set to true to restore the nav tab,
// the home feed "Talk with Muse" bar, and the /chat page.
export const CHAT_ENABLED = false;

// One-step agent checkout (Nov 2026): one review of every partner store in the cart, one
// Confirm, and Muse pays each store. Off until a payment method (Shop Pay, Visa) is live
// and the backend has AGENT_CHECKOUT_ENABLED=true. While off, the cart keeps the
// per-store "Check out at {store}" buttons and /cart/review sends shoppers back to /cart.
export const AGENT_CHECKOUT_ENABLED = false;
