import React from 'react';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PaymentProcessingProps {
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;
  message?: string;
  onComplete?: () => void;
}

export const PaymentProcessing: React.FC<PaymentProcessingProps> = ({
  status,
  amount,
  message,
  onComplete
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin text-blue-500" />,
          title: '決済処理中...',
          description: 'Stripeでの決済処理を完了しています。しばらくお待ちください。',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'succeeded':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-500" />,
          title: '決済完了！',
          description: 'Super Tipが正常に送信されました。',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'failed':
        return {
          icon: <XCircle className="w-8 h-8 text-red-500" />,
          title: '決済失敗',
          description: '決済の処理に失敗しました。もう一度お試しください。',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: <Clock className="w-8 h-8 text-gray-500" />,
          title: '処理中...',
          description: '処理を開始しています...',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} p-6`}>
      <div className="flex flex-col items-center text-center space-y-4">
        {config.icon}
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {config.title}
          </h3>
          <p className="text-sm text-gray-600">
            {message || config.description}
          </p>
        </div>

        <div className="bg-white rounded-lg px-4 py-2 border border-gray-200">
          <span className="text-sm text-gray-500">金額: </span>
          <span className="font-semibold text-gray-900">¥{amount.toLocaleString()}</span>
        </div>

        {status === 'pending' && (
          <div className="text-xs text-gray-500 max-w-sm">
            <p>※ 決済処理には最大2分程度かかる場合があります</p>
            <p>※ ページを閉じても処理は継続されます</p>
          </div>
        )}

        {status === 'succeeded' && onComplete && (
          <button
            onClick={onComplete}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            完了
          </button>
        )}

        {status === 'failed' && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            再試行
          </button>
        )}
      </div>
    </div>
  );
};
