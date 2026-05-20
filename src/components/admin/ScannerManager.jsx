import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, XCircle, ScanLine, Ticket, Camera, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ScannerManager() {
    const [ticketId, setTicketId] = useState("");
    const [loading, setLoading] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const queryClient = useQueryClient();

    // Dynamically load html5-qrcode
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/html5-qrcode";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    useEffect(() => {
        let html5QrcodeScanner = null;

        if (isCameraActive && window.Html5QrcodeScanner) {
            html5QrcodeScanner = new window.Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                /* verbose= */ false
            );

            html5QrcodeScanner.render((decodedText) => {
                // Success callback
                setTicketId(decodedText);
                setIsCameraActive(false); // Stop camera
                html5QrcodeScanner.clear();
            }, () => {
                // Ignore failure
            });
        }

        return () => {
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
            }
        };
    }, [isCameraActive]);

    const handleScan = async (e) => {
        if (e) e.preventDefault();
        if (!ticketId.trim()) return;

        setLoading(true);
        setScanResult(null);

        try {
            const { data: booking, error } = await supabase
                .from('jne_bookings')
                .select('*')
                .eq('ticket_id', ticketId.trim())
                .single();

            if (error || !booking) {
                setScanResult({
                    status: 'error',
                    message: 'Invalid Ticket ID',
                    subtitle: 'This ticket does not exist in our records.'
                });
                return;
            }

            if (booking.status === 'checked_in') {
                setScanResult({
                    status: 'warning',
                    message: 'Already Checked In',
                    subtitle: 'This ticket was previously validated.',
                    booking
                });
                return;
            }

            if (booking.status !== 'confirmed') {
                setScanResult({
                    status: 'error',
                    message: 'Payment Unconfirmed',
                    subtitle: `Current status: ${booking.status}`,
                    booking
                });
                return;
            }

            const { error: updateError } = await supabase
                .from('jne_bookings')
                .update({ status: 'checked_in' })
                .eq('id', booking.id);

            if (updateError) throw updateError;

            setScanResult({
                status: 'success',
                message: 'Access Granted',
                subtitle: 'Ticket verified successfully.',
                booking: { ...booking, status: 'checked_in' }
            });

            queryClient.invalidateQueries({ queryKey: ["booking-stats"] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });

        } catch (err) {
            console.error(err);
            setScanResult({
                status: 'error',
                message: 'Verification Error',
                subtitle: 'A network error occurred. Please try again.'
            });
        } finally {
            setLoading(false);
            setTicketId("");
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-8 py-4">
            {/* CSS Override for ugly html5-qrcode defaults to force Apple Dark Mode styling */}
            <style>{`
                #reader {
                    background: transparent !important;
                    border: none !important;
                    color: white !important;
                    font-family: inherit !important;
                }
                #reader__dashboard_section_csr span {
                    color: rgba(255,255,255,0.5) !important;
                    font-size: 13px !important;
                }
                #reader__dashboard_section_csr button {
                    background: rgba(255, 255, 255, 0.1) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: white !important;
                    border-radius: 8px !important;
                    padding: 6px 12px !important;
                    font-size: 13px !important;
                    font-weight: 500 !important;
                    margin: 8px 4px !important;
                    transition: all 0.2s ease;
                }
                #reader__dashboard_section_csr button:hover {
                    background: rgba(255, 255, 255, 0.15) !important;
                }
                #reader__camera_selection {
                    background: rgba(0, 0, 0, 0.5) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: white !important;
                    border-radius: 8px !important;
                    padding: 8px !important;
                    margin-bottom: 12px !important;
                    width: 100% !important;
                    max-width: 300px !important;
                }
                #reader video {
                    border-radius: 16px !important;
                    object-fit: cover !important;
                }
                #reader__dashboard_section_swaplink {
                    display: none !important; /* Hides the ugly 'scan an image file' link */
                }
            `}</style>

            <div className="text-center space-y-3">
                <h2 className="text-3xl font-semibold text-white tracking-tight">Check-In</h2>
                <p className="text-white/40 text-sm font-medium">Verify guest admission seamlessly.</p>
            </div>

            <div className="bg-[#1C1C1E]/50 border border-white/[0.04] backdrop-blur-3xl rounded-[32px] p-8 shadow-2xl">
                
                {/* Camera UI */}
                {isCameraActive ? (
                    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-medium text-white/80 text-sm">Camera Active</h3>
                            <button onClick={() => setIsCameraActive(false)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/[0.04] p-2">
                            <div id="reader" className="w-full"></div>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsCameraActive(true)}
                        className="w-full mb-8 py-8 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] transition-all text-white/50 hover:text-white group"
                    >
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">Open Scanner</span>
                    </button>
                )}

                <form onSubmit={handleScan} className="space-y-4">
                    <div className="relative group">
                        <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 transition-colors" />
                        <Input
                            placeholder="Ticket ID (e.g., JNE-12345)"
                            value={ticketId}
                            onChange={(e) => setTicketId(e.target.value)}
                            className="w-full bg-black/20 border-white/[0.04] rounded-2xl py-6 pl-12 pr-4 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:bg-white/[0.02] focus:border-white/20 transition-all focus:ring-0"
                        />
                    </div>
                    <Button 
                        type="submit" 
                        disabled={loading || !ticketId.trim()} 
                        className="w-full py-6 text-[15px] font-medium bg-violet-600 text-white hover:bg-violet-500 rounded-2xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
                    </Button>
                </form>

                {/* Apple-style Results UI */}
                {scanResult && (
                    <div className={`mt-8 p-6 rounded-2xl border animate-in fade-in slide-in-from-bottom-4 duration-500 flex items-start gap-5 ${
                        scanResult.status === 'success' ? 'bg-[#1C2C22] border-[#2E4A35]' :
                        scanResult.status === 'warning' ? 'bg-[#332612] border-[#553E1B]' :
                        'bg-[#2C1919] border-[#4A2828]'
                    }`}>
                        <div className={`p-2 rounded-full mt-1 ${
                            scanResult.status === 'success' ? 'bg-[#34C759]/20 text-[#34C759]' :
                            scanResult.status === 'warning' ? 'bg-[#FF9F0A]/20 text-[#FF9F0A]' :
                            'bg-[#FF453A]/20 text-[#FF453A]'
                        }`}>
                            {scanResult.status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                        </div>
                        <div className="space-y-1 text-left flex-1">
                            <h3 className="font-semibold text-[17px] text-white tracking-tight">{scanResult.message}</h3>
                            <p className="text-[13px] text-white/60 leading-relaxed">{scanResult.subtitle}</p>
                            
                            {scanResult.booking && (
                                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                    <div className="flex justify-between items-center text-[13px]">
                                        <span className="text-white/40">Attendee</span>
                                        <span className="text-white font-medium">{scanResult.booking.attendee_name}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[13px]">
                                        <span className="text-white/40">Event</span>
                                        <span className="text-white font-medium">{scanResult.booking.event_title}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[13px]">
                                        <span className="text-white/40">Tier</span>
                                        <span className="text-white font-medium">{scanResult.booking.tier_label || 'Standard'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
