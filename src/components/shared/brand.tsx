import Link from "next/link";
import Image from "next/image";
export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="brand" aria-label="Hirevelo">
      <Image
        src="/brand/hirevelo-horizontal.svg"
        alt=""
        width={730}
        height={192}
        className="brand-logo"
        priority
      />
    </Link>
  );
}
