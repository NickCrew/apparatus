import { useEffect, useRef } from 'react';
import { ClusterNode } from '../../hooks/useCluster';

interface ClusterMapProps {
    nodes: ClusterNode[];
    isAttacking: boolean;
}

export function ClusterMap({ nodes, isAttacking }: ClusterMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodesRef = useRef(nodes);
    const isAttackingRef = useRef(isAttacking);

    // Keep refs in sync
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { isAttackingRef.current = isAttacking; }, [isAttacking]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        
        const resize = () => {
            if (canvas.parentElement) {
                const width = canvas.parentElement.clientWidth;
                const height = canvas.parentElement.clientHeight;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Reset transform before scaling
            }
        };
        window.addEventListener('resize', resize);
        resize();

        let animationFrame: number;
        let rotation = 0;
        let lastFrameTime = 0;

        const render = (timestamp: number) => {
            if (document.hidden) {
                animationFrame = requestAnimationFrame(render);
                return;
            }

            // Throttle FPS when idle (not attacking) to ~10fps to save battery
            const targetFps = isAttackingRef.current ? 60 : 10;
            const interval = 1000 / targetFps;
            if (timestamp - lastFrameTime < interval) {
                animationFrame = requestAnimationFrame(render);
                return;
            }
            lastFrameTime = timestamp;

            if (!canvas.parentElement) return;
            const width = canvas.parentElement.clientWidth;
            const height = canvas.parentElement.clientHeight;
            const centerX = width / 2;
            const centerY = height / 2;

            const currentNodes = nodesRef.current;
            const currentAttacking = isAttackingRef.current;

            ctx.clearRect(0, 0, width, height);

            const radius = Math.min(width, height) / 3;
            // Only pulse when attacking
            const pulse = currentAttacking ? (Math.sin(Date.now() / 100) * 0.5 + 0.5) : 0;
            const linkColor = currentAttacking 
                ? `rgba(0, 240, 255, ${0.2 + pulse * 0.3})`
                : 'rgba(31, 38, 51, 0.5)';

            const peers = currentNodes.filter(n => n.role !== 'self');
            
            peers.forEach((node, i) => {
                const divisor = peers.length || 1;
                const angle = (i / divisor) * Math.PI * 2 + rotation;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                // Line
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(x, y);
                ctx.strokeStyle = linkColor;
                ctx.lineWidth = currentAttacking ? 2 : 1;
                ctx.stroke();

                // Node
                ctx.fillStyle = currentAttacking ? '#00A3FF' : '#00B140';
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // Only render expensive shadow blur when attacking
                if (currentAttacking) {
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 15;
                    ctx.fill();
                    ctx.shadowBlur = 0; // Reset
                }

                ctx.fillStyle = '#4D5B70';
                ctx.font = '10px JetBrains Mono';
                ctx.fillText(node.ip, x + 10, y + 3);
            });

            // Center Node
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
            ctx.fill();
            
            if (currentAttacking) {
                ctx.shadowColor = '#FFFFFF';
                ctx.shadowBlur = 20;
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.strokeStyle = '#00F0FF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + 40, 0, Math.PI * 2);
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            rotation += 0.002;
            animationFrame = requestAnimationFrame(render);
        };

        animationFrame = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return <canvas 
        ref={canvasRef} 
        className="w-full h-full block" 
        role="img" 
        aria-label={`Cluster map showing ${nodes.length} nodes. Status: ${isAttacking ? 'ATTACKING' : 'IDLE'}`} 
    />;
}
