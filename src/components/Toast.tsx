interface ToastProps {
  message: string;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, visible }) => {
  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[10002] bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in-out">
      {message}
    </div>
  );
};