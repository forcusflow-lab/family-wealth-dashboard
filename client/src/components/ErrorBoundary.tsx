import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <main className="grid min-h-screen place-items-center bg-[#F3F5F2] p-6 text-[#17362C]"><section className="w-full max-w-xl rounded-[2rem] border border-[#D8E5DC] bg-white p-8 text-center shadow-[0_18px_50px_rgba(23,54,44,0.08)] sm:p-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#FFF0D7] text-[#96601D]"><AlertTriangle size={30}/></div><p className="mt-6 text-[10px] font-semibold tracking-[0.18em] text-[#78633A]">表示を続けられません</p><h1 className="mt-3 font-serif text-3xl sm:text-4xl">画面の表示で問題が起きました</h1><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#60756A]">入力中の内容が保存されていない場合があります。ページを再読み込みして、もう一度お試しください。内部のエラー情報や資産データは画面に表示しません。</p><button onClick={() => window.location.reload()} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#17362C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#284B42]"><RotateCcw size={16}/>ページを再読み込み</button></section></main>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
