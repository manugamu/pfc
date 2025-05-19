package com.proyectofinal.model;

import java.util.ArrayList;
import java.util.List;

public class FallaInfo {
    private String fallaCode;
    private List<String> falleroIds = new ArrayList<>();
    private List<String> pendingRequests = new ArrayList<>();

    public String getFallaCode() {
        return fallaCode;
    }

    public void setFallaCode(String fallaCode) {
        this.fallaCode = fallaCode;
    }

    public List<String> getFalleroIds() {
        return falleroIds;
    }

    public void setFalleroIds(List<String> falleroIds) {
        this.falleroIds = falleroIds;
    }

    public List<String> getPendingRequests() {
        return pendingRequests;
    }

    public void setPendingRequests(List<String> pendingRequests) {
        this.pendingRequests = pendingRequests;
    }

    public void addFallero(String userId) {
        if (!falleroIds.contains(userId)) {
            falleroIds.add(userId);
        }
    }

    public void removeFallero(String userId) {
        falleroIds.remove(userId);
    }

    public void addPendingRequest(String userId) {
        if (!pendingRequests.contains(userId)) {
            pendingRequests.add(userId);
        }
    }

    public void removePendingRequest(String userId) {
        pendingRequests.remove(userId);
    }
}
