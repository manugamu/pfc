package com.proyectofinal.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String username;
    private String password;
    private String email;
    private String fullName;
    private String phone;
    private String address;
    private String role;
    private boolean active;
    private String profileImageUrl;

    private List<RefreshTokenInfo> refreshTokens = new ArrayList<>();

    private FallaInfo fallaInfo;

    private String codigoFalla;
    private boolean pendienteUnion = false;

    public User() {}

    public User(String username, String password, String email, String fullName,
                String phone, String address, String role, boolean active) {
        this.username = username;
        this.password = password;
        this.email = email;
        this.fullName = fullName;
        this.phone = phone;
        this.address = address;
        this.role = role;
        this.active = active;
    }

 
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getProfileImageUrl() { return profileImageUrl; }
    public void setProfileImageUrl(String profileImageUrl) { this.profileImageUrl = profileImageUrl; }

    public List<RefreshTokenInfo> getRefreshTokens() { return refreshTokens; }
    public void setRefreshTokens(List<RefreshTokenInfo> refreshTokens) { this.refreshTokens = refreshTokens; }

    public FallaInfo getFallaInfo() { return fallaInfo; }
    public void setFallaInfo(FallaInfo fallaInfo) { this.fallaInfo = fallaInfo; }

    public String getCodigoFalla() { return codigoFalla; }
    public void setCodigoFalla(String codigoFalla) { this.codigoFalla = codigoFalla; }

    public boolean isPendienteUnion() { return pendienteUnion; }
    public void setPendienteUnion(boolean pendienteUnion) { this.pendienteUnion = pendienteUnion; }

  
    public static class FallaInfo {
        private String fallaCode; 
        private List<String> falleroIds = new ArrayList<>();
        private List<String> pendingRequests = new ArrayList<>();
        public String getFallaCode() { return fallaCode; }
        public void setFallaCode(String fallaCode) { this.fallaCode = fallaCode; }

        public List<String> getFalleroIds() { return falleroIds; }
        public void setFalleroIds(List<String> falleroIds) { this.falleroIds = falleroIds; }

        public List<String> getPendingRequests() { return pendingRequests; }
        public void setPendingRequests(List<String> pendingRequests) { this.pendingRequests = pendingRequests; }
    }


    public static class RefreshTokenInfo {
        private String deviceId;
        private String token;

        public RefreshTokenInfo() {}

        public RefreshTokenInfo(String deviceId, String token) {
            this.deviceId = deviceId;
            this.token = token;
        }

        public String getDeviceId() { return deviceId; }
        public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
    }
}
