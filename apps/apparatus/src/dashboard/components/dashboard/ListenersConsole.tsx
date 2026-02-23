import { ProtocolGrid } from './ProtocolGrid';

export function ListenersConsole() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl text-neutral-100 ml-2 type-heading">Infrastructure Listeners</h1>
        <p className="text-neutral-400 text-sm mt-1 ml-2">Real-time status of multi-protocol surface area and open ports.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="h-[600px]">
            <ProtocolGrid glow="primary" />
        </div>
      </div>
    </div>
  );
}
