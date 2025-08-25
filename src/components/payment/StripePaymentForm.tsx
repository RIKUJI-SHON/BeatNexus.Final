import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
  Elements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Stripe公開キーを設定
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RzgHB6glJHJtgubd5RQLwspXvCnJ1hrMBQLJxBoyRO8jdw5JKRx97n8IRsSh9rKH1vF30RIpzIgNiGnZ2lNfNkh00S3Eh1Jus');

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  clientSecret,
  amount,
  onSuccess,
  onCancel,
  onError
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe が読み込まれていません');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('カード情報の入力フォームが見つかりません');
      return;
    }

    setIsProcessing(true);

    try {
      // PaymentIntentを確認して決済を完了
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        console.error('❌ Payment failed:', error);
        onError(error.message || '決済に失敗しました');
      } else if (paymentIntent?.status === 'succeeded') {
        console.log('✅ Payment succeeded:', paymentIntent.id);
        onSuccess();
      } else {
        onError('決済処理が完了しませんでした');
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      onError('決済処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">💳 支払い情報</h3>
        <p className="text-gray-300">
          金額: <span className="font-bold text-green-400">¥{amount.toLocaleString()}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-white font-medium mb-2">
            カード情報
          </label>
          <div className="p-3 border border-gray-600 rounded-md bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!stripe || isProcessing}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? '処理中...' : `¥${amount.toLocaleString()} 支払う`}
          </button>
        </div>
      </form>
    </div>
  );
};

// Stripe Elementsプロバイダーでラップしたメインコンポーネント
export const StripePaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};
