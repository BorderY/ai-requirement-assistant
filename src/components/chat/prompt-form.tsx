interface PromptFormProps {
    input: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onQuickSubmit: () => void;
    onStop: () => void;
    onClear: () => void;
}


export function PromptForm(
    {
        input,
        isLoading,
        onInputChange,
        onSubmit,
        onQuickSubmit,
        onStop,
        onClear, }: PromptFormProps

) {

    return (
        <form className="space-y-3" onSubmit={onSubmit}>
            <label className="text-sm font-medium text-stone-700" htmlFor="prompt">
                发送内容
            </label>
            <textarea
                id="prompt"
                name="prompt"
                className="min-h-28 w-full resize-none rounded-3xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-500"
                placeholder="例如：请帮我拆解一个后台管理系统的商品列表页需求"
                value={input}
                onChange={event => onInputChange(event.target.value)}

                onKeyDown={event => {
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        onQuickSubmit();
                    }
                }}
            />

            <div className="flex flex-wrap items-center gap-3">
                <button
                    className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading || input.trim().length === 0}
                    type="submit"
                >
                    {isLoading ? "生成中..." : "发送"}
                </button>

                <button
                    className="rounded-2xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!isLoading}
                    type="button"
                    onClick={onStop}
                >
                    停止生成
                </button>

                <button
                    className="rounded-2xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                    type="button"
                    onClick={() => {
                        onStop();
                        onClear();
                    }}
                >
                    清空会话
                </button>
            </div>
        </form>
    )
}