import { useEffect, useRef } from 'react';
import { PackageNode } from '../../hooks/useDependencyGraph';

interface SupplyChainMapProps {
    nodes: PackageNode[];
    onNodeClick: (node: PackageNode) => void;
}

const VIS_CONFIG = {
    NODE_RADIUS: 5,
    APP_RADIUS: 10,
    REPULSION: 100,
    SPRING_LENGTH: 50,
    SPRING_STRENGTH: 0.05,
    DAMPING: 0.9
} as const;

export function SupplyChainMap({ nodes, onNodeClick }: SupplyChainMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simulationRef = useRef<any[]>([]); // Simulation state
    const nodesRef = useRef(nodes);
    
    // Track mouse for interaction
    const mouseRef = useRef({ x: 0, y: 0, clicked: false });

    // Initialize/Update Simulation nodes when prop changes
    useEffect(() => {
        // Map incoming nodes to simulation nodes (preserving positions if ID matches)
        const newSimNodes = nodes.map(n => {
            const existing = simulationRef.current.find(sn => sn.id === n.id);
            return {
                ...n,
                x: existing?.x || Math.random() * 800,
                y: existing?.y || Math.random() * 600,
                vx: existing?.vx || 0,
                vy: existing?.vy || 0
            };
        });
        simulationRef.current = newSimNodes;
        nodesRef.current = nodes;
    }, [nodes]);

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
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
        };
        window.addEventListener('resize', resize);
        resize();

        // Interaction Handlers
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = e.clientX - rect.left;
            mouseRef.current.y = e.clientY - rect.top;
        };
        const handleClick = () => {
            // Hit test
            const clickX = mouseRef.current.x;
            const clickY = mouseRef.current.y;
            
            const hit = simulationRef.current.find(n => {
                const dx = n.x - clickX;
                const dy = n.y - clickY;
                return Math.sqrt(dx*dx + dy*dy) < (n.type === 'app' ? VIS_CONFIG.APP_RADIUS : VIS_CONFIG.NODE_RADIUS) + 5; // +5 slop
            });
            
            if (hit) onNodeClick(nodesRef.current.find(n => n.id === hit.id)!);
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('click', handleClick);

        let animationFrame: number;

        const render = () => {
            if (document.hidden) {
                animationFrame = requestAnimationFrame(render);
                return;
            }

            if (!canvas.parentElement) return;
            const width = canvas.parentElement.clientWidth;
            const height = canvas.parentElement.clientHeight;
            const simNodes = simulationRef.current;

            // --- Physics Step ---
            // 1. Repulsion (Nodes push apart)
            for (let i = 0; i < simNodes.length; i++) {
                for (let j = i + 1; j < simNodes.length; j++) {
                    const a = simNodes[i];
                    const b = simNodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                    
                    if (dist < 200) {
                        const force = VIS_CONFIG.REPULSION / (dist * dist);
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        a.vx += fx;
                        a.vy += fy;
                        b.vx -= fx;
                        b.vy -= fy;
                    }
                }
            }

            // 2. Springs (Dependencies pull together)
            simNodes.forEach(node => {
                node.dependencies.forEach((depId: string) => {
                    const depNode = simNodes.find(n => n.id === depId);
                    if (depNode) {
                        const dx = depNode.x - node.x;
                        const dy = depNode.y - node.y;
                        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                        const force = (dist - VIS_CONFIG.SPRING_LENGTH) * VIS_CONFIG.SPRING_STRENGTH;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        
                        node.vx += fx;
                        node.vy += fy;
                        depNode.vx -= fx;
                        depNode.vy -= fy;
                    }
                });
            });

            // 3. Center Gravity & Update
            simNodes.forEach(node => {
                // Pull to center
                node.vx += (width/2 - node.x) * 0.0005;
                node.vy += (height/2 - node.y) * 0.0005;

                node.vx *= VIS_CONFIG.DAMPING;
                node.vy *= VIS_CONFIG.DAMPING;
                
                node.x += node.vx;
                node.y += node.vy;
            });

            // --- Render Step ---
            ctx.clearRect(0, 0, width, height);

            // Draw Edges
            // Arrow logic is simpler: Draw line from dependent -> dependency
            // Dependent depends on Dependency. Infection flows Dependency -> Dependent.
            // So if Dependency is infected, arrow of infection flows UP to Dependent.
            // Visualizing "Dependency" relation: Node -> Dependency.
            
            ctx.lineWidth = 1;
            simNodes.forEach(node => {
                node.dependencies.forEach((depId: string) => {
                    const depNode = simNodes.find(n => n.id === depId);
                    if (depNode) {
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(depNode.x, depNode.y);
                        
                        // Color edge red if the dependency is the source of infection for this node?
                        // Simple logic: if Dep is infected, line is red.
                        const isDanger = depNode.status !== 'clean';
                        ctx.strokeStyle = isDanger ? '#FF0055' : '#323C4D';
                        ctx.globalAlpha = isDanger ? 0.8 : 0.3;
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                });
            });

            // Draw Nodes
            simNodes.forEach(node => {
                const r = node.type === 'app' ? VIS_CONFIG.APP_RADIUS : VIS_CONFIG.NODE_RADIUS;
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
                
                if (node.status === 'clean') ctx.fillStyle = '#4D5B70'; // Grey
                else if (node.status === 'infected') ctx.fillStyle = '#FF0055'; // Red (Patient Zero)
                else ctx.fillStyle = '#FFB800'; // Orange (Compromised)
                
                // Highlight app root
                if (node.type === 'app') {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = ctx.fillStyle;
                    if (node.status !== 'clean') {
                        // App compromised!
                        ctx.fillStyle = '#FF0055'; 
                    } else {
                        ctx.fillStyle = '#00F0FF';
                    }
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.fill();
                ctx.shadowBlur = 0;

                // Label on hover or if infected
                const dx = mouseRef.current.x - node.x;
                const dy = mouseRef.current.y - node.y;
                const isHover = Math.sqrt(dx*dx + dy*dy) < r + 10;

                if (isHover || node.status !== 'clean' || node.type === 'app') {
                    ctx.font = '10px JetBrains Mono';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(node.name, node.x + 8, node.y + 3);
                }
            });

            animationFrame = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('click', handleClick);
            cancelAnimationFrame(animationFrame);
        };
    }, []); // Only mount once

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full block cursor-crosshair" 
            role="img" 
            aria-label="Dependency graph visualization" 
        />
    );
}
