import User from "../Models/User.js";
import Transaction from "../Models/Transaction.js";

// 💰 Deposit funds (Inflow)
export const createDeposit = async (req, res) => {
  try {
    const { amount, source } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid deposit amount" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Update inflow totals
    user.balance += amount;
    user.inflow = (user.inflow || 0) + amount;
    user.inflowHistory = user.inflowHistory || [];
    user.inflowHistory.push({ amount, source: source || "Deposit" });

    // ✅ Record transaction
    const transaction = await Transaction.create({
      user: user._id,
      type: "deposit",
      amount,
      description: source || "Deposit",
      balanceAfter: user.balance,
    });

    // ✅ Record activity
    user.loginActivities.push({
      action: `Deposited $${amount}`,
      timestamp: new Date(),
    });

    await user.save();

    res.status(200).json({
      message: `Deposit of $${amount} successful`,
      balance: user.balance,
      inflow: user.inflow,
      transaction,
    });
  } catch (error) {
    console.error("Deposit Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 💸 Withdraw funds (Outflow)
export const createWithdrawal = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // ✅ Update outflow totals
    user.balance -= amount;
    user.outflow = (user.outflow || 0) + amount;
    user.outflowHistory = user.outflowHistory || [];
    user.outflowHistory.push({ amount, reason: reason || "Withdrawal" });

    // ✅ Record transaction
    const transaction = await Transaction.create({
      user: user._id,
      type: "withdrawal",
      amount,
      description: reason || "Withdrawal",
      balanceAfter: user.balance,
    });

    // ✅ Record activity
    user.loginActivities.push({
      action: `Withdrew $${amount}`,
      timestamp: new Date(),
    });

    await user.save();

    res.status(200).json({
      message: `Withdrawal of $${amount} successful`,
      balance: user.balance,
      outflow: user.outflow,
      transaction,
    });
  } catch (error) {
    console.error("Withdrawal Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 📊 Get account balance
export const getBalance = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "balance firstName lastName inflow outflow"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Balance fetched successfully",
      name: `${user.firstName} ${user.lastName}`,
      balance: user.balance,
      inflow: user.inflow || 0,
      outflow: user.outflow || 0,
    });
  } catch (error) {
    console.error("Balance Fetch Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧾 Get all transactions for a user
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    const transactions = await Transaction.find({ user: userId }).sort({
      createdAt: -1,
    });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: "No transactions found" });
    }

    res.status(200).json({
      message: "Transactions fetched successfully",
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Get Transactions Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
