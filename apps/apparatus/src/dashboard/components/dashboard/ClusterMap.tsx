import { useEffect, useRef } from 'react';
import { ClusterNode } from '../../hooks/useCluster';

interface ClusterMapProps {
    nodes: ClusterNode[];
    isAttacking: boolean;
}

const CLUSTER_VIS = {
    NODE_RADIUS: 6,
    CENTER_RADIUS: 12,
    ROTATION_SPEED: 0.002,
    IDLE_FPS: 10,
    ACTIVE_FPS: 60
} as const;

export function ClusterMap({ nodes, isAttacking }: ClusterMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nodesRef = useRef(nodes);
    const isAttackingRef = useRef(isAttacking);
    const peersRef = useRef<ClusterNode[]>([]);

    useEffect(() => { 
        nodesRef.current = nodes;
        peersRef.current = nodes.filter(n => n.role !== 'self');
    }, [nodes]);
    
    useEffect(() => { isAttackingRef.current = isAttacking; }, [isAttacking]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        const resize = () => {
            if (canvas.parentElement) {
                const width = canvas.parentElement.clientWidth;
                const height = canvas.parentElement.clientHeight;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

            const currentAttacking = isAttackingRef.current;
            const targetFps = currentAttacking && !prefersReducedMotion ? CLUSTER_VIS.ACTIVE_FPS : CLUSTER_VIS.IDLE_FPS;
            
            const interval = 1000 / targetFps;
            if (timestamp - lastFrameTime < interval) {
                animationFrame = requestAnimationFrame(render);
                return;
            }
            lastFrameTime = timestamp;

            if (!canvas.parentElement) {
                // Keep loop alive but skip render if detached
                animationFrame = requestAnimationFrame(render);
                return;
            }

            const width = canvas.parentElement.clientWidth;
            const height = canvas.parentElement.clientHeight;
            const centerX = width / 2;
            const centerY = height / 2;

            const peers = peersRef.current;

            // Clear full buffer (using logical coords since we have scale transform applied)
            ctx.clearRect(0, 0, width, height);

            const radius = Math.min(width, height) / 3;
            const pulse = (currentAttacking && !prefersReducedMotion) ? (Math.sin(timestamp / 500) * 0.5 + 0.5) : 0;
            const linkColor = currentAttacking 
                ? `rgba(0, 240, 255, ${0.2 + pulse * 0.3})`
                : 'rgba(31, 38, 51, 0.5)';

            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Pass 1: Lines
            peers.forEach((_, i) => {
                const divisor = peers.length || 1;
                const angle = (i / divisor) * Math.PI * 2 + rotation;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(x, y);
                ctx.strokeStyle = linkColor;
                ctx.lineWidth = currentAttacking ? 2 : 1;
                ctx.stroke();
            });

            // Pass 2: Nodes (Batched Shadows)
            if (currentAttacking && !prefersReducedMotion) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00A3FF';
            } else {
                ctx.shadowBlur = 0;
            }

            peers.forEach((_, i) => {
                const divisor = peers.length || 1;
                const angle = (i / divisor) * Math.PI * 2 + rotation;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                ctx.fillStyle = currentAttacking ? '#00A3FF' : '#00B140';
                ctx.beginPath();
                ctx.arc(x, y, CLUSTER_VIS.NODE_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.shadowBlur = 0; // Reset

            // Pass 3: Labels (No shadow)
            ctx.fillStyle = '#9BA9BF';
            peers.forEach((node, i) => {
                const divisor = peers.length || 1;
                const angle = (i / divisor) * Math.PI * 2 + rotation;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                ctx.fillText(node.ip, x + 10, y + 3);
            });

            // Center Node
            ctx.fillStyle = '#FFFFFF';
            if (currentAttacking && !prefersReducedMotion) {
                ctx.shadowColor = '#FFFFFF';
                ctx.shadowBlur = 20;
            }
            ctx.beginPath();
            ctx.arc(centerX, centerY, CLUSTER_VIS.CENTER_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            if (currentAttacking) {
                ctx.strokeStyle = '#00F0FF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + 40, 0, Math.PI * 2);
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            if (!prefersReducedMotion) {
                rotation = (rotation + CLUSTER_VIS.ROTATION_SPEED) % (Math.PI * 2);
            }
            animationFrame = requestAnimationFrame(render);
        };

        animationFrame = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <div className="relative w-full h-full">
            <canvas 
                ref={canvasRef} 
                className="w-full h-full block" 
                role="img" 
                aria-label={`Cluster visualization`} 
            />
            <span className="sr-only" role="status" aria-live="polite">
                Cluster status: {isAttacking ? 'Load Test Running' : 'Idle'}. {nodes.length} nodes connected.
            </span>
        </div>
    );
}
