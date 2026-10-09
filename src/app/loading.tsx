import { LiquidLoader } from "@/components/ui/liquid-loader";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <LiquidLoader />
    </div>
  );
}
