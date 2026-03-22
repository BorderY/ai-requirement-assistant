interface ErrorBannerProps {
    message?: string;
    canRetry?: boolean;
    onRetryClick?: () => void;
}


export function ErrorBanner({ message, canRetry, onRetryClick }: ErrorBannerProps) {
    return (
        <section className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex flex-wrap items-center gap-3">
                <span>{message}</span>
                {canRetry ? (
                    <button
                        className="font-medium underline underline-offset-4"
                        type="button"
                        onClick={onRetryClick}
                    >
                        重试上一条
                    </button>
                ) : null}
            </div>
        </section>

    )
}