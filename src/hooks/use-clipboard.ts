"use client";

import { useCallback } from "react";
import { toast } from "sonner";

export function useClipboard(successMessage: string, errorMessage: string) {
	return useCallback(
		async (value: string): Promise<boolean> => {
			try {
				await navigator.clipboard.writeText(value);
				toast.success(successMessage);
				return true;
			} catch {
				toast.error(errorMessage);
				return false;
			}
		},
		[errorMessage, successMessage],
	);
}
