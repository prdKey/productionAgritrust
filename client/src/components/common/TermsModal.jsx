// components/TermsModal.jsx
export default function TermsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative z-50 bg-white shadow-xl rounded-lg w-full max-w-md flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Agritrust Platform</p>
            <h2 className="text-lg font-semibold">Terms and Conditions</h2>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
            Updated Apr 14, 2026
          </span>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 text-sm text-gray-500 leading-relaxed">
          {sections.map(({ title, content }) => (
            <section key={title}>
              <h3 className="text-sm font-medium text-gray-700 mb-1">{title}</h3>
              <p>{content}</p>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
            Decline
          </button>
          <button onClick={onClose}
            className="px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition">
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}

const sections = [
  { title: "1. Introduction", content: "Welcome to Agritrust, a decentralized agricultural marketplace powered by AGT tokens. By accessing or using this platform, you agree to comply with these Terms and Conditions." },
  { title: "2. Account Registration", content: "Users must provide accurate and complete information. Users are responsible for maintaining account security. Agritrust may suspend or terminate accounts for violations." },
  { title: "3. Use of Platform", content: "Users agree to use the platform only for lawful purposes, avoid fraud or manipulation, provide accurate information, and not attempt to bypass system payments or security." },
  { title: "4. Transactions and Payments", content: "All transactions are processed within the platform. Payments may be held in escrow until completion. Sellers receive payment after successful order completion or auto-confirmation." },
  { title: "5. Order Auto-Confirmation", content: "Orders marked 'Awaiting Buyer Confirmation' will auto-confirm after 3 days if no action is taken, releasing payment to the seller. Buyers may file disputes before auto-confirmation." },
  { title: "6. Refunds and Disputes", content: "Buyers may raise disputes for incorrect, damaged, or missing items. Agritrust will review disputes fairly and may request evidence. Fraudulent claims may result in account penalties." },
  { title: "7. Logistics and Delivery", content: "Address data is not publicly visible and is restricted to authorized parties only on a need-to-know basis per delivery assignment." },
  { title: "8. Prohibited Activities", content: "Users must not engage in fraudulent transactions, provide false listings, abuse disputes or refund systems, attempt unauthorized access, or violate applicable laws." },
  { title: "9. Data Privacy", content: "Agritrust complies with the Data Privacy Act of 2012. Data is only shared with payment processors, logistics providers, and legal authorities when required by law. Sensitive data is encrypted." },
  { title: "10. Wallet and Escrow", content: "Funds are stored in an internal wallet and released only after order completion or auto-confirmation. Agritrust is not responsible for external wallet misuse outside the platform." },
  { title: "11. Limitation of Liability", content: "Agritrust acts as a marketplace facilitator only. Users assume responsibility for their own actions on the platform." },
  { title: "12. Governing Law", content: "These Terms shall be governed by the laws of the Philippines." },
  { title: "13. Blockchain Disclosure", content: "Agritrust utilizes blockchain-based systems to improve transparency. Users acknowledge that blockchain records may be immutable once confirmed." },
];