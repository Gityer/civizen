import { Suspense, lazy } from 'react';

const QrCodeSvg = lazy(() =>
  import('qrcode.react').then((module) => ({
    default: module.QRCodeSVG,
  })),
);

type DeferredQrCodeProps = {
  value: string;
  size?: number;
  includeMargin?: boolean;
  bgColor?: string;
  fgColor?: string;
  className?: string;
  title?: string;
};

export function DeferredQrCode(props: DeferredQrCodeProps) {
  return (
    <Suspense fallback={<div className={props.className} style={{ width: props.size, height: props.size }} />}>
      <QrCodeSvg {...props} />
    </Suspense>
  );
}
