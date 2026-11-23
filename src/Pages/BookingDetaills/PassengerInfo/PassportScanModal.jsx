import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import DocumentScannerRoundedIcon from "@mui/icons-material/DocumentScannerRounded";
import { scanPassportImage } from "@/utils/passportScanner";

const PassportScanModal = ({
  open,
  travelerLabel = "Traveler",
  onClose,
  onApplyExtracted,
  parsePayload,
  hasFields,
}) => {
  const [mode, setMode] = useState("upload"); // "upload" | "camera"
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedPreview, setExtractedPreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setScanning(false);
      setErrorMessage("");
      setCameraError("");
      setExtractedPreview(null);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }
      setMode("upload");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError("");
    setErrorMessage("");
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        "Live camera capture is unavailable in this browser. Switch to Upload Photo instead."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        "Camera permission denied or no camera detected. You can upload a passport photo instead."
      );
    }
  };

  useEffect(() => {
    if (open && mode === "camera" && !previewUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, previewUrl]);

  const runScanOnFile = async (file) => {
    if (!file) return;
    setErrorMessage("");
    setExtractedPreview(null);
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    setScanning(true);
    try {
      const payload = await scanPassportImage(file);
      const parsed =
        typeof parsePayload === "function"
          ? parsePayload(payload)
          : payload?.extractedData || {};
      const ok =
        typeof hasFields === "function"
          ? hasFields(parsed || {})
          : Boolean(parsed && Object.values(parsed).some(Boolean));
      if (!ok) {
        setErrorMessage(
          "Could not read the 2-line MRZ code at the bottom of the passport. Try a sharper, glare-free photo."
        );
      } else {
        setExtractedPreview(parsed);
      }
    } catch (err) {
      setErrorMessage(
        err?.message ||
          "Passport scan failed. Ensure you are signed in and try a clearer JPEG/PNG photo."
      );
    } finally {
      setScanning(false);
    }
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const captured = new File([blob], "passport-capture.jpg", {
          type: "image/jpeg",
        });
        runScanOnFile(captured);
      },
      "image/jpeg",
      0.92
    );
  };

  const handleResetPhoto = () => {
    setSelectedFile(null);
    setExtractedPreview(null);
    setErrorMessage("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
  };

  const handleApply = () => {
    if (extractedPreview && typeof onApplyExtracted === "function") {
      onApplyExtracted(extractedPreview);
    }
    onClose?.();
  };

  return (
    <Dialog
      open={Boolean(open)}
      onClose={scanning ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="passport-scan-modal-title"
      PaperProps={{
        sx: {
          borderRadius: "18px",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        id="passport-scan-modal-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "#0b2e59",
          color: "#ffffff",
          py: 1.6,
          px: 2.5,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <DocumentScannerRoundedIcon sx={{ color: "#38bdf8" }} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "16.5px", lineHeight: 1.2 }}>
              Scan Passport — {travelerLabel}
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "rgba(226,240,255,0.85)" }}>
              Auto-fills traveler details from the 2-line MRZ code
            </Typography>
          </Box>
        </Stack>
        <IconButton
          type="button"
          aria-label="Close passport scanner"
          disabled={scanning}
          onClick={onClose}
          sx={{ color: "#ffffff" }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>
        <Tabs
          value={mode}
          onChange={(_, val) => {
            handleResetPhoto();
            setMode(val);
          }}
          sx={{ mb: 2, borderBottom: "1px solid #e2ecf5" }}
        >
          <Tab
            value="upload"
            icon={<CloudUploadRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Upload Photo"
            sx={{ textTransform: "none", fontWeight: 700, minHeight: 44 }}
          />
          <Tab
            value="camera"
            icon={<PhotoCameraRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Use Camera"
            sx={{ textTransform: "none", fontWeight: 700, minHeight: 44 }}
          />
        </Tabs>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>
            {errorMessage}
          </Alert>
        )}

        {/* Mode 1: Upload / Drag-and-drop */}
        {mode === "upload" && !previewUrl && (
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer?.files?.[0];
              if (f) runScanOnFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            sx={{
              border: isDragging
                ? "2px dashed #007bb0"
                : "2px dashed #b9d3ea",
              bgcolor: isDragging ? "#eef8ff" : "#f8fbff",
              borderRadius: "14px",
              p: 3.5,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 150ms ease",
              "&:hover": { borderColor: "#007bb0", bgcolor: "#f0f9ff" },
            }}
          >
            <CloudUploadRoundedIcon sx={{ fontSize: 44, color: "#007bb0", mb: 1 }} />
            <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#0f2942" }}>
              Drop passport photo here or click to browse
            </Typography>
            <Typography sx={{ fontSize: "12.5px", color: "#526B86", mt: 0.6 }}>
              Supports JPEG, PNG, WebP up to 8 MB. Keep both MRZ lines at the bottom flat &amp; sharp.
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) runScanOnFile(f);
                if (e.target) e.target.value = "";
              }}
            />
          </Box>
        )}

        {/* Mode 2: Live Camera Viewfinder */}
        {mode === "camera" && !previewUrl && (
          <Box>
            {cameraError ? (
              <Alert severity="warning" sx={{ borderRadius: "10px" }}>
                {cameraError}
              </Alert>
            ) : (
              <Box
                sx={{
                  position: "relative",
                  borderRadius: "14px",
                  overflow: "hidden",
                  bgcolor: "#061529",
                  aspectRatio: "16 / 10",
                }}
              >
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {/* MRZ Alignment Frame */}
                <Box
                  aria-hidden="true"
                  sx={{
                    position: "absolute",
                    inset: "12% 8% 12% 8%",
                    border: "2px dashed rgba(56, 189, 248, 0.9)",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    p: 1,
                    pointerEvents: "none",
                  }}
                >
                  <Box
                    sx={{
                      border: "2px solid #38bdf8",
                      borderRadius: "6px",
                      bgcolor: "rgba(0, 123, 176, 0.16)",
                      px: 1,
                      py: 0.6,
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ color: "#e0f2fe", fontSize: "11px", fontWeight: 800 }}>
                      ALIGN 2-LINE MRZ CODE INSIDE THIS BAR
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
            {cameraActive && (
              <Box sx={{ mt: 1.5, display: "flex", justifyContent: "center" }}>
                <Button
                  type="button"
                  variant="contained"
                  startIcon={<PhotoCameraRoundedIcon />}
                  onClick={handleCaptureFrame}
                  sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    borderRadius: "10px",
                    minHeight: 44,
                    px: 3,
                    background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
                  }}
                >
                  Capture &amp; Scan Passport
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Selected / Captured Image Preview + Scanning / Extracted Review */}
        {previewUrl && (
          <Box>
            <Box
              sx={{
                position: "relative",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #d7e6f5",
                bgcolor: "#0f172a",
                maxHeight: 220,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src={previewUrl}
                alt="Passport preview"
                style={{ maxHeight: 220, maxWidth: "100%", objectFit: "contain" }}
              />
            </Box>

            {scanning && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <CircularProgress size={22} />
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "14px", color: "#0b4a82" }}>
                    Reading passport MRZ lines...
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: "#475569" }}>
                    Extracting name, passport number, nationality, and dates securely.
                  </Typography>
                </Box>
              </Box>
            )}

            {!scanning && extractedPreview && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.8,
                  borderRadius: "12px",
                  bgcolor: "#f0fdf4",
                  border: "1px solid #86efac",
                }}
              >
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.2 }}>
                  <CheckCircleRoundedIcon sx={{ color: "#16a34a", fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "14px", color: "#14532d" }}>
                    Passport Read Successfully — Review &amp; Apply
                  </Typography>
                </Stack>
                <Grid container spacing={1}>
                  {[
                    ["First Name", extractedPreview.fName],
                    ["Last Name", extractedPreview.lName],
                    ["Passport No.", extractedPreview.passNo],
                    ["Nationality", extractedPreview.passNation],
                    ["Date of Birth", extractedPreview.dob],
                    ["Expiry Date", extractedPreview.passEx],
                    ["Gender", extractedPreview.gender],
                  ]
                    .filter(([, val]) => Boolean(val))
                    .map(([label, val]) => (
                      <Grid item xs={6} key={label}>
                        <Typography sx={{ fontSize: "11px", color: "#475569", fontWeight: 700 }}>
                          {label}
                        </Typography>
                        <Typography sx={{ fontSize: "13px", color: "#0f2942", fontWeight: 800 }}>
                          {String(val)}
                        </Typography>
                      </Grid>
                    ))}
                </Grid>
              </Box>
            )}

            {!scanning && (
              <Box sx={{ mt: 1.5, display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  startIcon={<ReplayRoundedIcon />}
                  onClick={handleResetPhoto}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Choose Another Photo
                </Button>
                {selectedFile && !extractedPreview && (
                  <Button
                    type="button"
                    size="small"
                    variant="contained"
                    onClick={() => runScanOnFile(selectedFile)}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Retry Scan
                  </Button>
                )}
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
          <Chip size="small" label="No Glare" sx={{ fontSize: "11px", fontWeight: 700 }} />
          <Chip size="small" label="Include Bottom 2 MRZ Lines" sx={{ fontSize: "11px", fontWeight: 700 }} />
          <Chip size="small" label="Processed Locally on Server" sx={{ fontSize: "11px", fontWeight: 700 }} />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, justifyContent: "space-between" }}>
        <Button
          type="button"
          onClick={onClose}
          disabled={scanning}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="contained"
          disabled={!extractedPreview || scanning}
          onClick={handleApply}
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: "10px",
            px: 3,
            background: "linear-gradient(120deg, #0b4a82 0%, #0082c4 100%)",
          }}
        >
          Apply to Traveler Form
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PassportScanModal;
