import React, { useState, useEffect } from "react";

const initialAccounts = [
  { name: "Mpesa_KES_1", currency: "KES", balance: 50000 },
  { name: "Mpesa_KES_2", currency: "KES", balance: 30000 },
  { name: "Bank_KES_3", currency: "KES", balance: 100000 },
  { name: "Bank_USD_1", currency: "USD", balance: 20000 },
  { name: "Bank_USD_2", currency: "USD", balance: 15000 },
  { name: "Wallet_USD_3", currency: "USD", balance: 10000 },
  { name: "Bank_NGN_1", currency: "NGN", balance: 800000 },
  { name: "Bank_NGN_2", currency: "NGN", balance: 500000 },
  { name: "Wallet_NGN_3", currency: "NGN", balance: 300000 },
  { name: "Reserve_NGN_4", currency: "NGN", balance: 200000 },
];

const fxRates = {
  KES: { USD: 0.0068, NGN: 5.7 },
  USD: { KES: 147.0, NGN: 840.0 },
  NGN: { KES: 0.175, USD: 0.0012 },
};

export default function App() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [transactions, setTransactions] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [form, setForm] = useState({ from: '', to: '', amount: '', note: '', date: '' });
  const [filter, setFilter] = useState({ account: '', currency: '' });
  const [totals, setTotals] = useState({});
  const [showAccounts, setShowAccounts] = useState(true);

  // Process scheduled transfers on load or update
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const dueTransfers = scheduled.filter(tx => tx.date <= today);
    if (dueTransfers.length === 0) return;

    const updatedAccounts = [...accounts];
    const completedTransfers = [];

    dueTransfers.forEach(tx => {
      const fromAcc = updatedAccounts.find(acc => acc.name === tx.from);
      const toAcc = updatedAccounts.find(acc => acc.name === tx.to);
      const amt = parseFloat(tx.amount);
      let convertedAmount = amt;

      if (!fromAcc || !toAcc || isNaN(amt) || amt <= 0 || fromAcc.balance < amt) return;

      if (fromAcc.currency !== toAcc.currency) {
        const rate = fxRates[fromAcc.currency]?.[toAcc.currency];
        if (!rate) return;
        convertedAmount = amt * rate;
      }

      fromAcc.balance -= amt;
      toAcc.balance += convertedAmount;

      completedTransfers.push({
        ...tx,
        convertedAmount,
        fromCurrency: fromAcc.currency,
        toCurrency: toAcc.currency,
      });
    });

    setAccounts(updatedAccounts);
    setScheduled(scheduled.filter(tx => !dueTransfers.includes(tx)));
    setTransactions(prev => [...completedTransfers.reverse(), ...prev]);
  }, [scheduled]);

  // Update totals by currency
  useEffect(() => {
    const totalsMap = {};
    accounts.forEach(acc => {
      if (!totalsMap[acc.currency]) {
        totalsMap[acc.currency] = 0;
      }
      totalsMap[acc.currency] += acc.balance;
    });
    setTotals(totalsMap);
  }, [accounts]);

  const handleTransfer = () => {
    const { from, to, amount, note, date } = form;
    const amt = parseFloat(amount);
    if (!from || !to || isNaN(amt) || amt <= 0) return alert("Invalid input");
    if (from === to) return alert("Cannot transfer to the same account");


    const fromAcc = accounts.find((a) => a.name === from);
    const toAcc = accounts.find((a) => a.name === to);
    if (!fromAcc || !toAcc) return alert("Accounts not found");

    const today = new Date().toISOString().split("T")[0];
    if (date && date < today) return alert("Please use present or future dates only");

    if (date && date > today) {
      setScheduled([{ id: Date.now(), ...form }, ...scheduled]);
      setForm({ from: '', to: '', amount: '', note: '', date: '' });
      return alert("Scheduled transfer saved.");
    }

    let convertedAmount = amt;
    if (fromAcc.currency !== toAcc.currency) {
      const rate = fxRates[fromAcc.currency]?.[toAcc.currency];
      if (!rate) return alert("No FX rate");
      convertedAmount = amt * rate;
    }

    if (fromAcc.balance < amt) return alert("Insufficient funds");

    const newAccounts = accounts.map((acc) => {
      if (acc.name === from) return { ...acc, balance: acc.balance - amt };
      if (acc.name === to) return { ...acc, balance: acc.balance + convertedAmount };
      return acc;
    });

    setAccounts(newAccounts);
    setTransactions([
      {
        id: Date.now(),
        from,
        to,
        amount: amt,
        convertedAmount,
        fromCurrency: fromAcc.currency,
        toCurrency: toAcc.currency,
        note,
        date: date || today,
      },
      ...transactions,
    ]);
    setForm({ from: '', to: '', amount: '', note: '', date: '' });
  };

  const filteredTransactions = transactions.filter((t) => {
    return (
      (!filter.account || t.from === filter.account || t.to === filter.account) &&
      (!filter.currency || t.fromCurrency === filter.currency || t.toCurrency === filter.currency)
    );
  });

  return (
    <div className="p-6 font-sans bg-slate-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Treasury Movement Simulator</h1>

      {/* Account Balances */}
      <section className="mb-12">
        <h2
          className="text-2xl font-semibold mb-2 cursor-pointer"
          onClick={() => setShowAccounts(!showAccounts)}
        >
          Accounts {showAccounts ? '▲' : '▼'}
        </h2>

        {showAccounts && (
          <>
            {/* Account Table */}
            <div className="overflow-auto rounded shadow mb-6 border border-gray-300">
              <table className="min-w-full table-auto bg-white">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-[5mm] border border-gray-300 text-left">Account</th>
                    <th className="p-[5mm] border border-gray-300 text-left">Balance</th>
                    <th className="p-[5mm] border border-gray-300 text-left">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.name} className="hover:bg-gray-50">
                      <td className="p-[5mm] border border-gray-200 font-medium">{acc.name}</td>
                      <td className="p-[5mm] border border-gray-200">{acc.balance.toFixed(2)}</td>
                      <td className="p-[5mm] border border-gray-200">{acc.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Balances */}
            <div className="bg-blue-100 p-[5mm] rounded shadow">
              <h3 className="font-semibold mb-2">Total Balances</h3>
              <ul className="space-y-1">
                {Object.entries(totals).map(([currency, amount]) => (
                  <li key={currency}>
                    <span className="font-medium">{currency}</span>:{" "}
                    <span className={amount < 0 ? "text-red-600" : "text-black"}>
                      {amount.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
      {/* Transfer Form */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Transfer Funds</h2>
        <table className="bg-white p-6 rounded shadow max-w-2xl w-full">
          <tbody>
            {[
              ["From Account", "from"],
              ["To Account", "to"],
              ["Amount", "amount", "number"],
              ["Note", "note", "text"],
              ["Date (dd/mm/yyyy)", "date", "date"]
            ].map(([label, key, type = "select"]) => (
              <tr key={key}>
                <td className="p-2 font-semibold">{label}</td>
                <td className="p-2">
                  {type === "select" ? (
                    <select
                      className="w-full border p-2 rounded"
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                    >
                      <option value="">Select account</option>
                      {accounts.map(acc => (
                        <option key={acc.name} value={acc.name}>{acc.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full border p-2 rounded"
                      type={type}
                      placeholder={label}
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                    />
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <td></td>
              <td className="p-2">
                <button
                  onClick={handleTransfer}
                  className="bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-900 transition"
                >
                  Submit Transfer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Filters */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Filter Logs</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <select className="p-2 border rounded" onChange={e => setFilter({ ...filter, account: e.target.value })}>
            <option value="">All Accounts</option>
            {accounts.map(acc => <option key={acc.name} value={acc.name}>{acc.name}</option>)}
          </select>
          <select className="p-2 border rounded" onChange={e => setFilter({ ...filter, currency: e.target.value })}>
            <option value="">All Currencies</option>
            {[...new Set(accounts.map(a => a.currency))].map(cur => (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
        </div>
      </section>

     {/* Transaction Log */}
{filteredTransactions.length > 0 && (
  <section className="mb-8">
    <h2 className="text-2xl font-semibold mb-2">Transaction Log</h2>
    <div className="overflow-auto">
      <table className="min-w-full table-auto border-collapse border border-blue-300 bg-white rounded-md shadow-sm">
        <thead className="bg-blue-100 text-left">
          <tr>
            <th className="px-[19px] py-[19px] border border-blue-200">Date</th>
            <th className="px-[19px] py-[19px] border border-blue-200">From</th>
            <th className="px-[19px] py-[19px] border border-blue-200">To</th>
            <th className="px-[19px] py-[19px] border border-blue-200">Amount</th>
            <th className="px-[19px] py-[19px] border border-blue-200">Note</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-blue-50">
              <td className="px-[19px] py-[19px] border border-blue-100">{tx.date}</td>
              <td className="px-[19px] py-[19px] border border-blue-100">
                {tx.from} ({tx.fromCurrency})
              </td>
              <td className="px-[19px] py-[19px] border border-blue-100">
                {tx.to} ({tx.toCurrency})
              </td>
              <td className="px-[19px] py-[19px] border border-blue-100">
                {tx.amount} → <span className="font-medium">{tx.convertedAmount.toFixed(2)}</span>
              </td>
              <td className="px-[19px] py-[19px] border border-blue-100">{tx.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}
{/* Scheduled Transfers */}
<section className="mb-8">
  <h2 className="text-2xl font-semibold mb-2">Scheduled Transfers</h2>
  {scheduled.length > 0 ? (
    <div className="overflow-auto">
      <table className="min-w-full table-auto border-collapse border border-yellow-300 bg-white rounded-md shadow-sm">
        <thead className="bg-yellow-100 text-left">
          <tr>
            <th className="px-[19px] py-[19px] border border-yellow-200">Date</th>
            <th className="px-[19px] py-[19px] border border-yellow-200">From</th>
            <th className="px-[19px] py-[19px] border border-yellow-200">To</th>
            <th className="px-[19px] py-[19px] border border-yellow-200">Amount</th>
            <th className="px-[19px] py-[19px] border border-yellow-200">Note</th>
          </tr>
        </thead>
        <tbody>
          {scheduled.map((tx) => (
            <tr key={tx.id} className="hover:bg-yellow-50">
              <td className="px-[19px] py-[19px] border border-yellow-100">{tx.date}</td>
              <td className="px-[19px] py-[19px] border border-yellow-100">{tx.from}</td>
              <td className="px-[19px] py-[19px] border border-yellow-100">{tx.to}</td>
              <td className="px-[19px] py-[19px] border border-yellow-100">{tx.amount}</td>
              <td className="px-[19px] py-[19px] border border-yellow-100">{tx.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="ml-[19px] text-gray-500 italic">No scheduled transfers</p>
  )}
</section>
    </div>
  );
}
