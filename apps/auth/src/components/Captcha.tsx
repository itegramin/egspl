import { forwardRef, useImperativeHandle, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface CaptchaProps {
  /** Called with the hCaptcha response token once the user completes the challenge. */
  onTokenChange: (token: string | null) => void;
  /** Optional callback invoked when the widget errors or expires. */
  onError?: () => void;
}

export interface CaptchaHandle {
  /** Clears the current token and re-renders the challenge. */
  reset: () => void;
}

/**
 * Reusable hCaptcha wrapper for Supabase Auth CAPTCHA protection.
 *
 * The widget injects the hCaptcha script on first render (no index.html
 * change required). The site key is read from `VITE_HCAPTCHA_SITE_KEY`.
 *
 * Usage:
 *   const captcha = useRef<CaptchaHandle>(null);
 *   const [captchaToken, setCaptchaToken] = useState<string | null>(null);
 *   <Captcha ref={captcha} onTokenChange={setCaptchaToken} />
 *   // after a failed auth attempt: captcha.current?.reset();
 */
export const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(
  ({ onTokenChange, onError }, ref) => {
    const captchaRef = useRef<HCaptcha | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        // Clear local token state first so a stale token is never reused.
        onTokenChange(null);
        captchaRef.current?.resetCaptcha();
      },
    }));

    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

    // If the site key is not configured, render nothing and surface a warning
    // in the console rather than failing the page.
    if (!siteKey) {
      if (import.meta.env.DEV) {
        console.warn(
          '[hCaptcha] VITE_HCAPTCHA_SITE_KEY is not set. CAPTCHA will not render.'
        );
      }
      return null;
    }

    return (
      <div className="flex justify-center">
        <HCaptcha
          ref={captchaRef}
          sitekey={siteKey}
          theme="dark"
          size="normal"
          onVerify={(token) => onTokenChange(token)}
          onError={() => {
            onTokenChange(null);
            onError?.();
          }}
          onExpire={() => onTokenChange(null)}
        />
      </div>
    );
  }
);

Captcha.displayName = 'Captcha';