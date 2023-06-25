import React, { ReactNode } from "react";
import "./Grid.css";

interface BannerProps {
  children?: ReactNode;
  className?: string;
}

const Banner: React.FC<BannerProps> = ({ children, className }) => {
  if (!children && !className) {
    return <div className="banner"></div>;
  }
  if (!children) {
    return <div className={className}></div>;
  }
  if (!className) {
    return <div className="banner">{children}</div>;
  }
  return <div className={className}>{children}</div>;
};

export default Banner;
