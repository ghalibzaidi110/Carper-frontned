export const formatPKR = (amount: number): string => {
  return `₨ ${amount.toLocaleString("en-PK")}`;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const getTimeAgo = (date: string): string => {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
};
