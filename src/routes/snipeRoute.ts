import express from "express";

export const router = express.Router();

router.post("/token", (req, res) => {
  try {
    const event = req.body;

    // Log or process the event
    // console.log("Received Helius webhook:", event);

    // Always respond with status 200 and JSON
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

router.post("/transaction", (req, res) => {
  try {
    const event = req.body;

    // Log or process the event
    console.log("Received Helius webhook:", event);

    // Always respond with status 200 and JSON
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});
