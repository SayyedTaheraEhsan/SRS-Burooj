import { adminFetch } from "./adminApi";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const API = "http://localhost:5000";

// =====================================================
// PORTAL CUSTOM SELECT
// IMPORTANT:
// Dropdown is rendered directly into document.body.
// This prevents parent containers from clipping,
// hiding, overlapping, or covering the options.
// =====================================================

function LargeSelect({
  id,
  activeDropdown,
  setActiveDropdown,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  disabled = false,
}) {
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);

  const [dropdownPosition, setDropdownPosition] =
    useState(null);

  const isOpen = activeDropdown === id;

  const selectedOption = options.find(
    (option) =>
      String(option.value) === String(value)
  );

  // =====================================================
  // CALCULATE DROPDOWN POSITION
  // =====================================================

  const updateDropdownPosition = () => {
    if (!selectRef.current) {
      return;
    }

    const rect =
      selectRef.current.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const gap = 7;

    const desiredWidth = Math.max(
      rect.width,
      280
    );

    const horizontalPadding = 10;

    let left = rect.left;

    if (
      left + desiredWidth >
      viewportWidth - horizontalPadding
    ) {
      left =
        viewportWidth -
        desiredWidth -
        horizontalPadding;
    }

    if (left < horizontalPadding) {
      left = horizontalPadding;
    }

    const spaceBelow =
      viewportHeight -
      rect.bottom -
      gap -
      horizontalPadding;

    const spaceAbove =
      rect.top -
      gap -
      horizontalPadding;

    const minimumUsefulHeight = 180;

    let openUp = false;

    if (
      spaceBelow < minimumUsefulHeight &&
      spaceAbove > spaceBelow
    ) {
      openUp = true;
    }

    const availableHeight = Math.max(
      150,
      Math.min(
        360,
        openUp
          ? spaceAbove
          : spaceBelow
      )
    );

    let top;

    if (openUp) {
      top =
        rect.top -
        gap -
        availableHeight;
    } else {
      top = rect.bottom + gap;
    }

    if (top < horizontalPadding) {
      top = horizontalPadding;
    }

    if (
      top + availableHeight >
      viewportHeight - horizontalPadding
    ) {
      top =
        viewportHeight -
        availableHeight -
        horizontalPadding;
    }

    setDropdownPosition({
      top,
      left,
      width: desiredWidth,
      maxHeight: availableHeight,
    });
  };

  // =====================================================
  // OPEN / CLOSE
  // =====================================================

  useEffect(() => {
    if (!isOpen) {
      setDropdownPosition(null);
      return;
    }

    const frame =
      window.requestAnimationFrame(() => {
        updateDropdownPosition();
      });

    const handleScroll = () => {
      updateDropdownPosition();
    };

    const handleResize = () => {
      updateDropdownPosition();
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      true
    );

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.cancelAnimationFrame(frame);

      window.removeEventListener(
        "scroll",
        handleScroll,
        true
      );

      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [isOpen]);

  // =====================================================
  // OUTSIDE CLICK
  // =====================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsideClick = (event) => {
      const target = event.target;

      const clickedSelect =
        selectRef.current &&
        selectRef.current.contains(target);

      const clickedDropdown =
        dropdownRef.current &&
        dropdownRef.current.contains(target);

      if (
        !clickedSelect &&
        !clickedDropdown
      ) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [
    isOpen,
    setActiveDropdown,
  ]);

  // =====================================================
  // TOGGLE
  // =====================================================

  const toggleDropdown = () => {
    if (disabled) {
      return;
    }

    if (isOpen) {
      setActiveDropdown(null);
      return;
    }

    setActiveDropdown(id);
  };

  // =====================================================
  // SELECT OPTION
  // =====================================================

  const selectOption = (optionValue) => {
    onChange(optionValue);
    setActiveDropdown(null);
  };

  // =====================================================
  // DROPDOWN PORTAL
  // =====================================================

  const dropdownPortal =
    isOpen &&
    !disabled &&
    dropdownPosition &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            className="srs-notification-portal-dropdown"
            style={{
              position: "fixed",
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: `${dropdownPosition.maxHeight}px`,
              minHeight: "52px",

              boxSizing: "border-box",

              display: "flex",
              flexDirection: "column",

              padding: "7px",

              backgroundColor: "#ffffff",

              border:
                "2px solid #9ebbd0",

              borderRadius: "10px",

              boxShadow:
                "0 16px 40px rgba(0, 0, 0, 0.30)",

              overflowX: "hidden",
              overflowY: "auto",

              zIndex: 2147483647,

              isolation: "isolate",
            }}
          >
            {/* PLACEHOLDER */}

            <div
              role="option"
              aria-selected={!value}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();

                selectOption("");
              }}
              style={{
                flex: "0 0 50px",

                width: "100%",
                height: "50px",
                minHeight: "50px",
                maxHeight: "50px",

                boxSizing: "border-box",

                display: "flex",
                alignItems: "center",

                margin: "0 0 4px 0",
                padding: "0 15px",

                backgroundColor: !value
                  ? "#dceefa"
                  : "#ffffff",

                color: !value
                  ? "#075fa2"
                  : "#111111",

                border: "none",
                borderRadius: "7px",

                fontFamily:
                  "Arial, sans-serif",

                fontSize: "17px",
                fontWeight: 700,

                lineHeight: "20px",

                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",

                cursor: "pointer",

                userSelect: "none",

                position: "relative",

                zIndex: 2147483647,
              }}
            >
              {placeholder}
            </div>

            {/* OPTIONS */}

            {options.map(
              (option, index) => {
                const isSelected =
                  String(option.value) ===
                  String(value);

                return (
                  <div
                    key={`${String(
                      option.value
                    )}-${index}`}
                    role="option"
                    aria-selected={
                      isSelected
                    }
                    onMouseDown={(
                      event
                    ) => {
                      event.preventDefault();
                      event.stopPropagation();

                      selectOption(
                        option.value
                      );
                    }}
                    onMouseEnter={(
                      event
                    ) => {
                      event.currentTarget.style.backgroundColor =
                        isSelected
                          ? "#dceefa"
                          : "#eaf5fd";

                      event.currentTarget.style.color =
                        "#075fa2";
                    }}
                    onMouseLeave={(
                      event
                    ) => {
                      event.currentTarget.style.backgroundColor =
                        isSelected
                          ? "#dceefa"
                          : "#ffffff";

                      event.currentTarget.style.color =
                        isSelected
                          ? "#075fa2"
                          : "#111111";
                    }}
                    style={{
                      flex: "0 0 50px",

                      width: "100%",
                      height: "50px",
                      minHeight: "50px",
                      maxHeight: "50px",

                      boxSizing: "border-box",

                      display: "flex",
                      alignItems: "center",

                      margin:
                        index ===
                        options.length - 1
                          ? "0"
                          : "0 0 4px 0",

                      padding:
                        "0 15px",

                      backgroundColor:
                        isSelected
                          ? "#dceefa"
                          : "#ffffff",

                      color:
                        isSelected
                          ? "#075fa2"
                          : "#111111",

                      border: "none",

                      borderRadius: "7px",

                      fontFamily:
                        "Arial, sans-serif",

                      fontSize: "17px",

                      fontWeight: 700,

                      lineHeight:
                        "20px",

                      whiteSpace:
                        "nowrap",

                      overflow:
                        "hidden",

                      textOverflow:
                        "ellipsis",

                      cursor: "pointer",

                      userSelect: "none",

                      position:
                        "relative",

                      zIndex:
                        2147483647,
                    }}
                  >
                    {option.label}
                  </div>
                );
              }
            )}
          </div>,

          document.body
        )
      : null;

  return (
    <>
      {/* SELECT BOX */}

      <div
        ref={selectRef}
        className="notification-custom-select"
        style={{
          position: "relative",
          width: "100%",
          height: "52px",
          minHeight: "52px",
          boxSizing: "border-box",
          margin: 0,
          padding: 0,
          zIndex: isOpen ? 1000 : 1,
        }}
      >
        <div
          className="notification-select-box"
          onClick={toggleDropdown}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onKeyDown={(event) => {
            if (
              event.key ===
                "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();
              toggleDropdown();
            }

            if (
              event.key === "Escape"
            ) {
              setActiveDropdown(
                null
              );
            }
          }}
          style={{
            position: "relative",

            display: "flex",

            alignItems: "center",

            justifyContent:
              "space-between",

            width: "100%",

            height: "52px",

            minHeight: "52px",

            boxSizing:
              "border-box",

            margin: 0,

            padding:
              "0 16px",

            backgroundColor:
              "#ffffff",

            color:
              "#17324d",

            border:
              "2px solid #bfd2e2",

            borderRadius:
              "9px",

            fontFamily:
              "Arial, sans-serif",

            fontSize:
              "17px",

            fontWeight:
              700,

            lineHeight:
              "20px",

            cursor: disabled
              ? "not-allowed"
              : "pointer",

            overflow:
              "hidden",

            userSelect:
              "none",

            opacity:
              disabled ? 0.6 : 1,
          }}
        >
          <span
            className="notification-selected-text"
            style={{
              display: "block",

              flex:
                "1 1 auto",

              minWidth: 0,

              overflow:
                "hidden",

              whiteSpace:
                "nowrap",

              textOverflow:
                "ellipsis",

              color:
                "#17324d",

              fontSize:
                "17px",

              fontWeight:
                700,

              lineHeight:
                "20px",
            }}
          >
            {selectedOption
              ? selectedOption.label
              : placeholder}
          </span>

          <span
            className="notification-select-arrow"
            style={{
              display: "flex",

              flex:
                "0 0 30px",

              width: "30px",

              height: "30px",

              alignItems:
                "center",

              justifyContent:
                "center",

              color:
                "#075fa2",

              fontSize:
                "13px",

              lineHeight:
                "13px",

              pointerEvents:
                "none",
            }}
          >
            {isOpen
              ? "▲"
              : "▼"}
          </span>
        </div>
      </div>

      {dropdownPortal}
    </>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

function AdminNotifications() {
  const [notifications, setNotifications] =
    useState([]);

  const [customers, setCustomers] =
    useState([]);

  const [inquiries, setInquiries] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [activeDropdown, setActiveDropdown] =
    useState(null);

  const [recipientMode, setRecipientMode] =
    useState(
      "individual_customer"
    );

  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [selectedCustomers, setSelectedCustomers] =
    useState([]);

  const [selectedInquiry, setSelectedInquiry] =
    useState("");

  const [category, setCategory] =
    useState("General");

  const [notificationType, setNotificationType] =
    useState(
      "GeneralNotification"
    );

  const [channel, setChannel] =
    useState("Website");

  const [title, setTitle] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [editingId, setEditingId] =
    useState(null);

  // =====================================================
  // LOAD DATA
  // =====================================================

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);

    try {
      const [
        notificationRes,
        customerRes,
        inquiryRes,
      ] = await Promise.all([
        adminFetch(
          `${API}/api/notification-system`
        ),
        adminFetch(
          `${API}/api/customers`
        ),
        adminFetch(
          `${API}/api/inquiries`
        ),
      ]);

      const notificationData =
        await notificationRes.json();

      const customerData =
        await customerRes.json();

      const inquiryData =
        await inquiryRes.json();

      if (
        notificationData.success
      ) {
        setNotifications(
          notificationData.notifications ||
            notificationData.data ||
            []
        );
      } else {
        setNotifications([]);
      }

      const customerList =
        customerData.customers ||
        customerData.data ||
        (Array.isArray(
          customerData
        )
          ? customerData
          : []);

      setCustomers(customerList);

      const inquiryList =
        inquiryData.inquiries ||
        inquiryData.data ||
        (Array.isArray(
          inquiryData
        )
          ? inquiryData
          : []);

      setInquiries(inquiryList);
    } catch (error) {
      console.error(
        "LOAD NOTIFICATION DATA ERROR:",
        error
      );

      alert(
        "Failed to load notification data."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CUSTOMER ID
  // =====================================================

  const getCustomerId = (
    customer
  ) => {
    return (
      customer.profile_id ||
      customer.customer_id ||
      customer.id
    );
  };

  // =====================================================
  // CUSTOMER NAME
  // =====================================================

  const getCustomerName = (
    customer
  ) => {
    return (
      customer.name ||
      customer.customer_name ||
      customer.full_name ||
      customer.email ||
      `Customer ${getCustomerId(
        customer
      )}`
    );
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setEditingId(null);

    setRecipientMode(
      "individual_customer"
    );

    setSelectedCustomer("");
    setSelectedCustomers([]);
    setSelectedInquiry("");

    setCategory("General");

    setNotificationType(
      "GeneralNotification"
    );

    setChannel("Website");

    setTitle("");
    setMessage("");

    setActiveDropdown(null);
  };

  // =====================================================
  // TOGGLE CUSTOMER
  // =====================================================

  const toggleCustomer = (
    customerId
  ) => {
    const id =
      String(customerId);

    setSelectedCustomers(
      (previous) => {
        if (
          previous.includes(id)
        ) {
          return previous.filter(
            (item) =>
              item !== id
          );
        }

        return [
          ...previous,
          id,
        ];
      }
    );
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!title.trim()) {
      alert(
        "Please enter notification title."
      );
      return;
    }

    if (!message.trim()) {
      alert(
        "Please enter notification message."
      );
      return;
    }

    if (
      recipientMode ===
        "individual_customer" &&
      !selectedCustomer
    ) {
      alert(
        "Please select a customer."
      );
      return;
    }

    if (
      recipientMode ===
        "individual_inquiry" &&
      !selectedInquiry
    ) {
      alert(
        "Please select an inquiry contact."
      );
      return;
    }

    if (
      recipientMode ===
        "selected_customers" &&
      selectedCustomers.length ===
        0
    ) {
      alert(
        "Please select at least one customer."
      );
      return;
    }

    setSaving(true);
    setActiveDropdown(null);

    try {
      // =================================================
      // UPDATE EXISTING
      // =================================================

      if (editingId) {
        const response =
          await adminFetch(
            `${API}/api/notification-system/${editingId}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                category,
                notification_type:
                  notificationType,
                channel,
                title,
                message,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to update notification."
          );
        }

        alert(
          "Notification updated successfully."
        );

        resetForm();
        await loadAllData();

        return;
      }

      // =================================================
      // RECIPIENT DATA
      // =================================================

      let recipientType =
        "Customer";

      let customerIds = [];
      let inquiryIds = [];

      if (
        recipientMode ===
        "individual_customer"
      ) {
        const id =
          Number(
            selectedCustomer
          );

        if (!id) {
          throw new Error(
            "Invalid customer selected."
          );
        }

        customerIds = [id];
      }

      if (
        recipientMode ===
        "selected_customers"
      ) {
        customerIds =
          selectedCustomers
            .map(Number)
            .filter(Boolean);
      }

      if (
        recipientMode ===
        "all_customers"
      ) {
        customerIds =
          customers
            .map(
              getCustomerId
            )
            .filter(Boolean)
            .map(Number);
      }

      if (
        recipientMode ===
        "individual_inquiry"
      ) {
        recipientType =
          "Inquiry";

        const id =
          Number(
            selectedInquiry
          );

        if (!id) {
          throw new Error(
            "Invalid inquiry selected."
          );
        }

        inquiryIds = [id];
      }

      if (
        recipientMode ===
        "all_inquiries"
      ) {
        recipientType =
          "Inquiry";

        inquiryIds =
          inquiries
            .map(
              (inquiry) =>
                inquiry.id
            )
            .filter(Boolean)
            .map(Number);
      }

      if (
        recipientMode ===
        "customers_and_inquiries"
      ) {
        recipientType =
          "Customer";

        customerIds =
          customers
            .map(
              getCustomerId
            )
            .filter(Boolean)
            .map(Number);

        inquiryIds =
          inquiries
            .map(
              (inquiry) =>
                inquiry.id
            )
            .filter(Boolean)
            .map(Number);
      }

      if (
        customerIds.length ===
          0 &&
        inquiryIds.length === 0
      ) {
        throw new Error(
          "No recipients selected."
        );
      }

      // =================================================
      // REQUEST DATA
      // =================================================

      const bodyData = {
        recipient_type:
          recipientType,

        customer_ids:
          customerIds,

        inquiry_ids:
          inquiryIds,

        customer_id:
          customerIds.length === 1
            ? customerIds[0]
            : null,

        inquiry_id:
          inquiryIds.length === 1
            ? inquiryIds[0]
            : null,

        notification_type:
          notificationType,

        category,

        title:
          title.trim(),

        message:
          message.trim(),

        channel,

        is_automatic: 0,
      };

      console.log(
        "NOTIFICATION DATA:",
        bodyData
      );

      // =================================================
      // SEND
      // =================================================

      const response =
        await adminFetch(
          `${API}/api/notification-system/send`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                bodyData
              ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to create notification."
        );
      }

      alert(
        data.message ||
          "Notification sent successfully."
      );

      resetForm();

      await loadAllData();
    } catch (error) {
      console.error(
        "NOTIFICATION ERROR:",
        error
      );

      alert(
        error.message ||
          "Failed to create notification."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (
    notification
  ) => {
    setEditingId(
      notification.id
    );

    setCategory(
      notification.category ||
        "General"
    );

    setNotificationType(
      notification.notification_type ||
        "GeneralNotification"
    );

    setChannel(
      notification.channel ||
        "Website"
    );

    setTitle(
      notification.title ||
        ""
    );

    setMessage(
      notification.message ||
        ""
    );

    setActiveDropdown(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (
    id
  ) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this notification?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      const response =
        await adminFetch(
          `${API}/api/notification-system/${id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to delete notification."
        );
      }

      alert(
        "Notification deleted successfully."
      );

      await loadAllData();
    } catch (error) {
      console.error(
        "DELETE NOTIFICATION ERROR:",
        error
      );

      alert(
        error.message ||
          "Failed to delete notification."
      );
    }
  };

  // =====================================================
  // MARK READ
  // =====================================================

  const handleMarkRead =
    async (id) => {
      try {
        const response =
          await adminFetch(
            `${API}/api/notification-system/${id}/read`,
            {
              method: "PUT",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to mark notification as read."
          );
        }

        await loadAllData();
      } catch (error) {
        console.error(
          "MARK READ ERROR:",
          error
        );

        alert(
          error.message ||
            "Failed to mark notification as read."
        );
      }
    };

  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (
    dateValue
  ) => {
    if (!dateValue) {
      return "-";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateValue;
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =====================================================
  // RECIPIENT LABEL
  // =====================================================

  const getRecipientLabel = (
    notification
  ) => {
    if (
      notification.recipient_type ===
      "Inquiry"
    ) {
      return (
        notification.recipient_name ||
        "Inquiry Contact"
      );
    }

    return (
      notification.recipient_name ||
      notification.customer_name ||
      "Customer"
    );
  };

  // =====================================================
  // STATUS
  // =====================================================

  const getStatus = (
    notification
  ) => {
    if (
      notification.channel ===
      "Email"
    ) {
      return (
        notification.email_status ||
        "Pending"
      );
    }

    if (
      notification.channel ===
      "WhatsApp"
    ) {
      return (
        notification.whatsapp_status ||
        "Not Available"
      );
    }

    if (
      notification.channel ===
      "All"
    ) {
      return `Email: ${
        notification.email_status ||
        "Pending"
      } | WhatsApp: ${
        notification.whatsapp_status ||
        "Not Available"
      }`;
    }

    return (
      notification.website_status ||
      "Unread"
    );
  };

  // =====================================================
  // OPTIONS
  // =====================================================

  const recipientOptions = [
    {
      value:
        "individual_customer",
      label:
        "Individual Customer",
    },
    {
      value:
        "selected_customers",
      label:
        "Selected Customers",
    },
    {
      value:
        "all_customers",
      label:
        "All Customers",
    },
    {
      value:
        "individual_inquiry",
      label:
        "Individual Inquiry Contact",
    },
    {
      value:
        "all_inquiries",
      label:
        "All Inquiry Contacts",
    },
    {
      value:
        "customers_and_inquiries",
      label:
        "Customers + Inquiry Contacts",
    },
  ];

  const customerOptions =
    customers
      .map((customer) => {
        const id =
          getCustomerId(
            customer
          );

        if (!id) {
          return null;
        }

        return {
          value: id,
          label:
            getCustomerName(
              customer
            ),
        };
      })
      .filter(Boolean);

  const inquiryOptions =
    inquiries.map(
      (inquiry) => ({
        value:
          inquiry.id,
        label: `${
          inquiry.name ||
          "Inquiry"
        }${
          inquiry.phone ||
          inquiry.email
            ? ` - ${
                inquiry.phone ||
                inquiry.email
              }`
            : ""
        }`,
      })
    );

  const categoryOptions = [
    {
      value: "Payment",
      label: "Payment",
    },
    {
      value:
        "Construction",
      label:
        "Construction",
    },
    {
      value: "Property",
      label:
        "Property",
    },
    {
      value:
        "Documents",
      label:
        "Documents",
    },
    {
      value:
        "Promotion",
      label:
        "Promotion",
    },
    {
      value:
        "Inquiry",
      label:
        "Inquiry",
    },
    {
      value:
        "General",
      label:
        "General",
    },
  ];

  const notificationTypeOptions =
    [
      {
        value:
          "GeneralNotification",
        label:
          "General Notification",
      },
      {
        value:
          "PaymentReceived",
        label:
          "Payment Received",
      },
      {
        value:
          "PartialPayment",
        label:
          "Partial Payment",
      },
      {
        value:
          "PaymentReminder",
        label:
          "Payment Reminder",
      },
      {
        value:
          "ConstructionUpdate",
        label:
          "Construction Update",
      },
      {
        value:
          "DocumentRequired",
        label:
          "Document Required",
      },
      {
        value:
          "PropertyUpdate",
        label:
          "Property Update",
      },
      {
        value:
          "Promotion",
        label:
          "New Promotion",
      },
      {
        value:
          "InquiryUpdate",
        label:
          "Inquiry Update",
      },
      {
        value:
          "ImportantDate",
        label:
          "Important Date",
      },
    ];

  const channelOptions = [
    {
      value: "Website",
      label: "Website",
    },
    {
      value: "Email",
      label: "Email",
    },
    {
      value:
        "WhatsApp",
      label:
        "WhatsApp",
    },
    {
      value: "All",
      label:
        "All Channels",
    },
  ];

  // =====================================================
  // UI
  // =====================================================

  return (
    <>
      <style>{`

        .srs-notification-page {
          position: relative;
          width: 100%;
          min-height: 100vh;
          box-sizing: border-box;
        }

        /*
          IMPORTANT:
          The dropdown itself is rendered through
          React Portal and therefore these styles
          only control the select box.
        */

        .srs-notification-page
        .notification-custom-select {
          position: relative !important;

          display: block !important;

          width: 100% !important;

          height: 52px !important;
          min-height: 52px !important;

          margin: 0 !important;
          padding: 0 !important;

          box-sizing: border-box !important;

          z-index: 100 !important;
        }

        .srs-notification-page
        .notification-select-box:hover {
          border-color: #1688d6 !important;
        }

        .srs-notification-page
        .notification-input {
          width: 100% !important;

          box-sizing: border-box !important;

          min-height: 50px !important;

          padding: 12px 14px !important;

          border: 1px solid #c5d6e4 !important;

          border-radius: 8px !important;

          background: #ffffff !important;

          color: #17324d !important;

          font-family:
            Arial, sans-serif !important;

          font-size: 16px !important;

          outline: none !important;
        }

        .srs-notification-page
        .notification-input:focus {
          border-color: #1688d6 !important;

          box-shadow:
            0 0 0 3px
            rgba(22, 136, 214, 0.10) !important;
        }

        .srs-notification-page
        .notification-checkbox {
          display: flex !important;

          flex-direction: row !important;

          align-items: center !important;

          gap: 8px !important;

          min-height: 42px !important;

          padding: 7px 9px !important;

          box-sizing: border-box !important;

          color: #17324d !important;

          font-size: 16px !important;

          font-weight: 600 !important;

          cursor: pointer !important;
        }

        .srs-notification-page
        .notification-checkbox input {
          width: 18px !important;

          height: 18px !important;

          flex: 0 0 18px !important;

          margin: 0 !important;
        }

      `}</style>

      <div
        className="srs-notification-page"
        style={{
          padding: "25px",
          background: "#f7f3ea",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          {/* =================================================
              HEADER
              ================================================= */}

          <div
            style={{
              marginBottom: "25px",
            }}
          >
            <h1
              style={{
                margin: 0,
                color: "#0b1f3a",
                fontSize: "30px",
              }}
            >
              Notification Management
            </h1>

            <p
              style={{
                color: "#666",
                marginTop: "8px",
                fontSize: "15px",
              }}
            >
              Send manual notifications
              and view automatic
              notification history.
            </p>
          </div>

          {/* =================================================
              CREATE / EDIT FORM
              ================================================= */}

          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "25px",
              marginBottom: "30px",
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.08)",
              borderTop:
                "4px solid #c9a227",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#0b1f3a",
              }}
            >
              {editingId
                ? "Edit Notification"
                : "Create Manual Notification"}
            </h2>

            <form
              onSubmit={
                handleSubmit
              }
            >
              {/* SEND TO */}

              {!editingId && (
                <>
                  <label
                    style={labelStyle}
                  >
                    Send To
                  </label>

                  <LargeSelect
                    id="recipient"
                    activeDropdown={
                      activeDropdown
                    }
                    setActiveDropdown={
                      setActiveDropdown
                    }
                    value={
                      recipientMode
                    }
                    onChange={
                      setRecipientMode
                    }
                    options={
                      recipientOptions
                    }
                    placeholder="Select Recipient"
                  />

                  {/* INDIVIDUAL CUSTOMER */}

                  {recipientMode ===
                    "individual_customer" && (
                    <>
                      <label
                        style={
                          labelStyle
                        }
                      >
                        Customer
                      </label>

                      <LargeSelect
                        id="customer"
                        activeDropdown={
                          activeDropdown
                        }
                        setActiveDropdown={
                          setActiveDropdown
                        }
                        value={
                          selectedCustomer
                        }
                        onChange={
                          setSelectedCustomer
                        }
                        options={
                          customerOptions
                        }
                        placeholder="Select Customer"
                      />
                    </>
                  )}

                  {/* SELECTED CUSTOMERS */}

                  {recipientMode ===
                    "selected_customers" && (
                    <div
                      style={{
                        marginTop:
                          "15px",
                        border:
                          "1px solid #c9d9e8",
                        borderRadius:
                          "10px",
                        padding:
                          "12px",
                        maxHeight:
                          "220px",
                        overflowY:
                          "auto",
                        background:
                          "#ffffff",
                      }}
                    >
                      {customers.length ===
                      0 ? (
                        <p
                          style={{
                            fontSize:
                              "15px",
                            color:
                              "#777",
                          }}
                        >
                          No customers
                          found.
                        </p>
                      ) : (
                        customers.map(
                          (
                            customer
                          ) => {
                            const id =
                              getCustomerId(
                                customer
                              );

                            if (!id) {
                              return null;
                            }

                            const checked =
                              selectedCustomers.includes(
                                String(
                                  id
                                )
                              );

                            return (
                              <label
                                key={id}
                                className="notification-checkbox"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    checked
                                  }
                                  onChange={() =>
                                    toggleCustomer(
                                      id
                                    )
                                  }
                                />

                                <span>
                                  {getCustomerName(
                                    customer
                                  )}
                                </span>
                              </label>
                            );
                          }
                        )
                      )}
                    </div>
                  )}

                  {recipientMode ===
                    "selected_customers" &&
                    selectedCustomers.length >
                      0 && (
                      <p
                        style={{
                          color:
                            "#0b1f3a",
                          fontWeight:
                            "600",
                          fontSize:
                            "15px",
                          marginTop:
                            "8px",
                        }}
                      >
                        Selected Customers:{" "}
                        {
                          selectedCustomers.length
                        }
                      </p>
                    )}

                  {/* INDIVIDUAL INQUIRY */}

                  {recipientMode ===
                    "individual_inquiry" && (
                    <>
                      <label
                        style={
                          labelStyle
                        }
                      >
                        Inquiry Contact
                      </label>

                      <LargeSelect
                        id="inquiry"
                        activeDropdown={
                          activeDropdown
                        }
                        setActiveDropdown={
                          setActiveDropdown
                        }
                        value={
                          selectedInquiry
                        }
                        onChange={
                          setSelectedInquiry
                        }
                        options={
                          inquiryOptions
                        }
                        placeholder="Select Inquiry Contact"
                      />
                    </>
                  )}
                </>
              )}

              {/* CATEGORY */}

              <label
                style={labelStyle}
              >
                Category
              </label>

              <LargeSelect
                id="category"
                activeDropdown={
                  activeDropdown
                }
                setActiveDropdown={
                  setActiveDropdown
                }
                value={category}
                onChange={
                  setCategory
                }
                options={
                  categoryOptions
                }
                placeholder="Select Category"
              />

              {/* NOTIFICATION TYPE */}

              <label
                style={labelStyle}
              >
                Notification Type
              </label>

              <LargeSelect
                id="notificationType"
                activeDropdown={
                  activeDropdown
                }
                setActiveDropdown={
                  setActiveDropdown
                }
                value={
                  notificationType
                }
                onChange={
                  setNotificationType
                }
                options={
                  notificationTypeOptions
                }
                placeholder="Select Notification Type"
              />

              {/* CHANNEL */}

              <label
                style={labelStyle}
              >
                Channel
              </label>

              <LargeSelect
                id="channel"
                activeDropdown={
                  activeDropdown
                }
                setActiveDropdown={
                  setActiveDropdown
                }
                value={channel}
                onChange={
                  setChannel
                }
                options={
                  channelOptions
                }
                placeholder="Select Channel"
              />

              {/* TITLE */}

              <label
                style={labelStyle}
              >
                Notification Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Enter notification title"
                className="notification-input"
              />

              {/* MESSAGE */}

              <label
                style={labelStyle}
              >
                Message
              </label>

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                placeholder="Enter notification message"
                rows="5"
                className="notification-input"
                style={{
                  resize:
                    "vertical",
                  minHeight:
                    "130px",
                }}
              />

              {/* BUTTONS */}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "18px",
                }}
              >
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background:
                      "#0b1f3a",
                    color:
                      "#ffffff",
                    border: "none",
                    padding:
                      "12px 24px",
                    borderRadius:
                      "7px",
                    cursor: saving
                      ? "not-allowed"
                      : "pointer",
                    fontWeight:
                      "600",
                    fontSize:
                      "14px",
                  }}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Notification"
                    : "Send Notification"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={
                      resetForm
                    }
                    style={{
                      background:
                        "#eeeeee",
                      color:
                        "#333",
                      border:
                        "none",
                      padding:
                        "12px 24px",
                      borderRadius:
                        "7px",
                      cursor:
                        "pointer",
                      fontWeight:
                        "600",
                      fontSize:
                        "14px",
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* =================================================
              HISTORY
              ================================================= */}

          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "25px",
              boxShadow:
                "0 4px 18px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "20px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color:
                    "#0b1f3a",
                }}
              >
                Notification History
              </h2>

              <button
                type="button"
                onClick={
                  loadAllData
                }
                style={{
                  background:
                    "#c9a227",
                  color:
                    "#ffffff",
                  border:
                    "none",
                  padding:
                    "9px 16px",
                  borderRadius:
                    "6px",
                  cursor:
                    "pointer",
                  fontWeight:
                    "600",
                }}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p
                style={{
                  fontSize:
                    "15px",
                }}
              >
                Loading notifications...
              </p>
            ) : notifications.length ===
              0 ? (
              <div
                style={{
                  padding:
                    "30px",
                  textAlign:
                    "center",
                  color:
                    "#777",
                  border:
                    "1px dashed #ccc",
                  borderRadius:
                    "8px",
                  fontSize:
                    "15px",
                }}
              >
                No notifications
                found.
              </div>
            ) : (
              <div
                style={{
                  overflowX:
                    "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      "1050px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background:
                          "#0b1f3a",
                        color:
                          "#ffffff",
                      }}
                    >
                      <th
                        style={
                          thStyle
                        }
                      >
                        Date
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Recipient
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Category
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Title
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Type
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Channel
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Status
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Source
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {notifications.map(
                      (
                        notification
                      ) => (
                        <tr
                          key={
                            notification.id
                          }
                          style={{
                            borderBottom:
                              "1px solid #eee",
                          }}
                        >
                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatDate(
                              notification.created_at
                            )}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                "600",
                            }}
                          >
                            {getRecipientLabel(
                              notification
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {notification.category ||
                              "-"}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              maxWidth:
                                "220px",
                            }}
                          >
                            <strong>
                              {
                                notification.title
                              }
                            </strong>

                            <div
                              style={{
                                color:
                                  "#777",
                                fontSize:
                                  "13px",
                                marginTop:
                                  "4px",
                              }}
                            >
                              {
                                notification.message
                              }
                            </div>
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {notification.notification_type ||
                              "-"}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {notification.channel ||
                              "Website"}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontSize:
                                "13px",
                            }}
                          >
                            {getStatus(
                              notification
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {Number(
                              notification.is_automatic
                            ) === 1
                              ? "Automatic"
                              : "Manual"}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                gap:
                                  "6px",
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              {Number(
                                notification.is_automatic
                              ) !== 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEdit(
                                      notification
                                    )
                                  }
                                  style={{
                                    ...actionButtonStyle,
                                    background:
                                      "#0b1f3a",
                                  }}
                                >
                                  Edit
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkRead(
                                    notification.id
                                  )
                                }
                                style={{
                                  ...actionButtonStyle,
                                  background:
                                    "#777",
                                }}
                              >
                                Read
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    notification.id
                                  )
                                }
                                style={{
                                  ...actionButtonStyle,
                                  background:
                                    "#b42318",
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================
// STYLES
// =====================================================

const labelStyle = {
  display: "block",
  fontWeight: "600",
  marginTop: "16px",
  marginBottom: "7px",
  color: "#333",
  fontSize: "14px",
};

const thStyle = {
  padding: "12px 10px",
  textAlign: "left",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px 10px",
  verticalAlign: "top",
  fontSize: "14px",
};

const actionButtonStyle = {
  color: "#ffffff",
  border: "none",
  padding: "7px 10px",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};

export default AdminNotifications;