import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signedAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  fallback: string;
  className?: string;
  fallbackClassName?: string;
}

/** Avatar that resolves private storage objects to short-lived signed URLs. */
const UserAvatar = ({ src, fallback, className, fallbackClassName }: Props) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    signedAvatarUrl(src).then((u) => { if (active) setUrl(u); });
    return () => { active = false; };
  }, [src]);

  return (
    <Avatar className={className}>
      {url && <AvatarImage src={url} />}
      <AvatarFallback className={cn("bg-gradient-ocean text-primary-foreground font-bold", fallbackClassName)}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
