/**
 * API helper utilities for consistent error handling and validation
 */

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { PriorityFilter, StatusFilter } from "@/types/incidents";

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  ok: false;
  error: string;
  code?: string;
}

/**
 * Standard API success response format
 */
export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a standardized error response
 */
export function errorResponse(
  error: string,
  status: number = 500,
  code?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(code && { code }),
    },
    { status }
  );
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status }
  );
}

/**
 * Validate MongoDB ObjectId
 */
export function validateObjectId(id: string): { valid: boolean; error?: string } {
  if (!id || typeof id !== "string") {
    return { valid: false, error: "Invalid ID: must be a non-empty string" };
  }
  if (!ObjectId.isValid(id)) {
    return { valid: false, error: "Invalid ID: not a valid MongoDB ObjectId" };
  }
  return { valid: true };
}

/**
 * Validate and normalize status filter
 */
export function validateStatusFilter(
  value: string | null
): { valid: boolean; value?: StatusFilter; error?: string } {
  if (!value || value === "all") {
    return { valid: true, value: "all" };
  }
  if (value === "open" || value === "resolved") {
    return { valid: true, value };
  }
  return {
    valid: false,
    error: `Invalid status filter: must be one of "all", "open", "resolved"`,
  };
}

/**
 * Validate and normalize priority filter
 */
export function validatePriorityFilter(
  value: string | null
): { valid: boolean; value?: PriorityFilter; error?: string } {
  if (!value || value === "all") {
    return { valid: true, value: "all" };
  }
  if (value === "high" || value === "medium" || value === "low") {
    return { valid: true, value };
  }
  return {
    valid: false,
    error: `Invalid priority filter: must be one of "all", "high", "medium", "low"`,
  };
}

/**
 * Validate service name (alphanumeric, dashes, underscores, dots)
 */
export function validateServiceName(
  value: string | null | undefined
): { valid: boolean; value?: string; error?: string } {
  if (!value) {
    return { valid: false, error: "Service name is required" };
  }
  if (typeof value !== "string") {
    return { valid: false, error: "Service name must be a string" };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Service name cannot be empty" };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: "Service name must be 100 characters or less" };
  }
  // Allow alphanumeric, dashes, underscores, dots, and spaces
  if (!/^[a-zA-Z0-9._\-\s]+$/.test(trimmed)) {
    return {
      valid: false,
      error: "Service name contains invalid characters",
    };
  }
  return { valid: true, value: trimmed };
}

/**
 * Validate priority number (1-10)
 */
export function validatePriorityNumber(
  value: number | string | null | undefined
): { valid: boolean; value?: number; error?: string } {
  if (value === null || value === undefined) {
    return { valid: false, error: "Priority is required" };
  }
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) {
    return { valid: false, error: "Priority must be a number" };
  }
  if (num < 1 || num > 10) {
    return { valid: false, error: "Priority must be between 1 and 10" };
  }
  return { valid: true, value: Math.round(num) };
}

/**
 * Validate search query string
 */
export function validateSearchQuery(
  value: string | null | undefined
): { valid: boolean; value?: string; error?: string } {
  if (!value) {
    return { valid: true, value: "" };
  }
  if (typeof value !== "string") {
    return { valid: false, error: "Search query must be a string" };
  }
  const trimmed = value.trim();
  if (trimmed.length > 200) {
    return { valid: false, error: "Search query must be 200 characters or less" };
  }
  return { valid: true, value: trimmed };
}

/**
 * Safe JSON parsing with error handling
 */
export async function safeJsonParse<T = unknown>(
  request: Request
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const text = await request.text();
    if (!text) {
      return { success: false, error: "Request body is empty" };
    }
    const data = JSON.parse(text) as T;
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}

