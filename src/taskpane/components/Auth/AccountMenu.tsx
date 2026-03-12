import React from "react";
import { Avatar, Box, Divider, IconButton, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../../context/AuthContext";
import BillingDialog from "./BillingDialog";

const AccountMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [billingOpen, setBillingOpen] = React.useState(false);

  if (!user?.id) {
    return null;
  }

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "Account";

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 8,
          right: 10,
          zIndex: 1400,
          display: "flex",
          alignItems: "center",
          gap: 0.8,
        }}
      >
        <Tooltip title="Account">
          <IconButton
            size="small"
            onClick={(event) => setAnchorEl(event.currentTarget)}
            sx={{
              border: "1px solid rgba(148, 163, 184, 0.55)",
              backgroundColor: "rgba(255,255,255,0.95)",
            }}
          >
            <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: "#1d4ed8" }}>
              {(displayName || "A").charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disableRipple>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748b" }}>
              {user.email || "Signed in"}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setBillingOpen(true);
          }}
        >
          <ReceiptLongIcon fontSize="small" sx={{ mr: 1 }} />
          Billing and settings
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ManageAccountsIcon fontSize="small" sx={{ mr: 1 }} />
          Account
        </MenuItem>
        <MenuItem
          onClick={async () => {
            setAnchorEl(null);
            await signOut();
          }}
        >
          <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
          Sign out
        </MenuItem>
      </Menu>

      <BillingDialog
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        userId={user.id}
        email={user.email}
      />
    </>
  );
};

export default AccountMenu;
