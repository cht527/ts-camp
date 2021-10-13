import { useCallback, useState } from "react";

const useSubmit = (submitFunction: (...args: any[]) => unknown) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleSubmit = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);
        await submitFunction();
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    }, [submitFunction]);
    return [handleSubmit, loading, error];
};

export { useSubmit }
  