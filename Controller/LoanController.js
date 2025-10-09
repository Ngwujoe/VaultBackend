// Server/controllers/loanController.js
export const createLoanRequest = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Example: Save loan to database (dummy version for now)
    const loan = {
      user: req.user?._id || "guest",
      amount,
      reason,
      date: new Date(),
      status: "Pending",
    };

    console.log("New Loan Request:", loan);
    res.status(201).json({ message: "Loan request submitted", loan });
  } catch (error) {
    console.error("❌ Loan Request Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAllLoans = async (req, res) => {
  try {
    // Example: This would normally fetch from DB
    res.json([{ id: 1, amount: 5000, status: "Pending" }]);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
