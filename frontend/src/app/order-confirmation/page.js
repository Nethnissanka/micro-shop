"use client";
import { useRouter } from "next/navigation";
import { CheckCircle, Package, ArrowRight, Home } from "lucide-react";

export default function OrderConfirmation() {
  const router = useRouter();

  return (
    <div className="confirmation-container">
      <div className="glass-card text-center py-12">
        <div className="success-icon">
          <CheckCircle size={80} />
        </div>
        <h1 className="title">Order Confirmed!</h1>
        <p className="subtitle">
          Thank you for your purchase. Your order has been placed successfully and is now being processed.
        </p>
        
        <div className="info-box">
          <div className="info-item">
            <Package size={24} />
            <div>
              <h3>Track Your Order</h3>
              <p>You can see the status of your order in your profile.</p>
            </div>
          </div>
        </div>

        <div className="button-group">
          <button onClick={() => router.push("/profile")} className="btn-outline">
            View Orders <ArrowRight size={18} />
          </button>
          <button onClick={() => router.push("/")} className="btn-primary">
            <Home size={18} /> Back to Home
          </button>
        </div>
      </div>

      <style jsx>{`
        .confirmation-container {
          max-width: 600px;
          margin: 4rem auto;
          padding: 0 1rem;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 2rem;
          padding: 4rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .success-icon {
          color: #10b981;
          margin-bottom: 2rem;
          filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.3));
        }
        .title {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          background: linear-gradient(to right, #ffffff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtitle {
          color: #94a3b8;
          font-size: 1.125rem;
          margin-bottom: 3rem;
          line-height: 1.6;
        }
        .info-box {
          background: rgba(15, 23, 42, 0.4);
          border-radius: 1.25rem;
          padding: 1.5rem;
          width: 100%;
          margin-bottom: 3rem;
          text-align: left;
        }
        .info-item {
          display: flex;
          gap: 1.25rem;
          align-items: center;
        }
        .info-item h3 {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .info-item p {
          font-size: 0.9375rem;
          color: #64748b;
        }
        .button-group {
          display: flex;
          gap: 1rem;
          width: 100%;
        }
        @media (max-width: 480px) {
          .button-group {
            flex-direction: column-reverse;
          }
        }
        .btn-primary, .btn-outline {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          border-radius: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
        }
        .btn-outline {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
        }
        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}
