// pages/api/orders.js

export default function handler(req, res) {
  // 1. Check if the method is POST (creating an order)
  if (req.method === 'POST') {
    try {
      const orderData = req.body;

      // Logic check: If user sent no items, throw an error
      if (!orderData.items) {
        return res.status(400).json({ error: "No items in order" });
      }

      // Success!
      return res.status(201).json({ message: "Order created!", orderId: 123 });
      
    } catch (error) {
      // This catch block prevents the generic 500 error 
      // and tells you what actually went wrong.
      return res.status(500).json({ error: error.message });
    }
  }

  // 2. Handle wrong methods (e.g., someone tries to DELETE an order)
  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}