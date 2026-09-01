import "./ErrorState.css";

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export default function ErrorState({
  message = "Something went wrong loading this page.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="es-wrap" role="alert">
      <p className="es-message">{message}</p>
      {onRetry && (
        <button type="button" className="es-retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
